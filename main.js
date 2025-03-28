import wisp from "wisp-server-node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import express from "express";
import compression from "compression";
import { createServer } from "node:http";
import cluster from "node:cluster";
import os from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import fetch from "node-fetch";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";
import pino from "pino";
import dotenv from "dotenv";
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers', 'req.remoteAddress', 'req.remotePort', 'res.headers'],
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname,req,res'
    }
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url ? new URL(req.url, 'http://localhost').pathname : undefined,
      id: req.id
    }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: pino.stdSerializers.err
  }
});

if (!process.env.DEEPINFRA_API_KEY) {
  logger.warn('DEEPINFRA_API_KEY is not set in environment variables. API calls may be limited.');
}

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  logger.info(`Primary ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} workers...`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    logger.warn({workerId: worker.process.pid, code, signal}, 'Worker died, restarting...');
    cluster.fork();
  });

  setInterval(() => {
    const memUsage = process.memoryUsage();
    logger.debug({
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      workers: Object.keys(cluster.workers).length
    }, 'Resource usage (MB)');
  }, 300000);
} else {
  logger.info(`Worker ${process.pid} started`);
  
  const bare = createBareServer("/bare/");
  const __dirname = join(fileURLToPath(import.meta.url), "..");
  const app = express();
  
  app.set('trust proxy', 1);
  
  const publicPath = "public";

  app.use((req, res, next) => {
    const start = process.hrtime();
    
    res.on('finish', () => {
      const diff = process.hrtime(start);
      const time = diff[0] * 1e3 + diff[1] * 1e-6;
      const route = req.route ? req.route.path : req.path;
      
      logger.info({
        responseTime: time.toFixed(2),
        method: req.method,
        route,
        status: res.statusCode,
        contentLength: res.get('content-length'),
      }, 'Request completed');
    });
    
    next();
  });

  const appCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

  setInterval(() => {
    const stats = appCache.getStats();
    logger.debug({
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits / (stats.hits + stats.misses || 1)
    }, 'Cache statistics');
  }, 300000);

  const cacheMiddleware = (duration) => (req, res, next) => {
    const key = req.originalUrl || req.url;
    const cachedContent = appCache.get(key);
    
    if (cachedContent) {
      return res.send(cachedContent);
    }
    
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      appCache.set(key, body, duration);
      originalSend(body);
    };
    
    next();
  };

  app.use(compression({ level: 6 }));
  app.use(express.json({ limit: '10mb' }));

  const staticOptions = {
    maxAge: '1d',
    etag: true, 
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0');
      } else if (path.match(/\.(js|css|jpg|jpeg|png|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  };

  app.use(express.static(publicPath, staticOptions));
  app.use("/uv/", express.static(uvPath, staticOptions));
  app.use("/epoxy/", express.static(epoxyPath, staticOptions));
  app.use("/baremux/", express.static(baremuxPath, staticOptions));
  app.use("/baremod/", express.static(bareModulePath, staticOptions));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' null about:blank;");
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });

  ["loading", "apps", "games", "settings", "ai", "credits"].forEach(page => {
    app.use(`/${page}`, cacheMiddleware(300), (req, res) => {
      res.sendFile(join(__dirname, publicPath, `${page}.html`));
    });
  });

  ["apps", "games"].forEach(type => {
    app.use(`/api/${type}`, cacheMiddleware(600), (req, res) => {
      res.sendFile(join(__dirname, "appsgames", `${type}.json`));
    });
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 30, 
    standardHeaders: true,
    message: "Too many requests from this IP, please try again after a minute",
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded for AI endpoint');
      res.status(429).send(options.message);
    }
  });

  app.use("/api/predictions", aiLimiter, async (req, res) => {
    try {
      const { messages, hasAttachment } = req.body;

      if (!Array.isArray(messages)) {
        res.status(400).send("Invalid input: messages must be an array");
        logger.warn('Invalid input format for AI predictions');
        return;
      }

      const formattedMessages = messages.map((msg, index) => {
        if (index === messages.length - 1 && hasAttachment && msg.attachments) {
          return {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: msg.attachments[0].data }
              },
              {
                type: "text",
                text: msg.content || "What's in this image?"
              }
            ]
          };
        }
        return { role: msg.role, content: msg.content };
      });

      const selectedModel = process.env.DEEPINFRA_MODEL || "meta-llama/Llama-3.2-90B-Vision-Instruct";
      const systemPrompt = selectedModel.toLowerCase().includes("gemini")
        ? readFileSync(join(__dirname, "gemini.txt"), "utf8")
        : "You are a helpful assistant.";
      
      const requestData = {
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages
        ],
        stream: true
      };

      const headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      };

      if (process.env.DEEPINFRA_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.DEEPINFRA_API_KEY}`;
      } else {
        headers["x-deepinfra-source"] = "web-embed";
      }

      const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({statusCode: response.status, message: errorText}, 'AI provider error');
        res.status(response.status).send(errorText);
        return;
      }
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      let buffer = '';
      let responseCount = 0;
      
      response.body.on('data', (chunk) => {
        try {
          responseCount++;
          const text = chunk.toString('utf8');
          buffer += text;
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.substring(0, newlineIndex);
            buffer = buffer.substring(newlineIndex + 1);
            
            if (line.trim()) {
              if (line.startsWith('data:')) {
                res.write(`${line}\n\n`);
              } else {
                res.write(`data: ${line}\n\n`);
              }
              if (res.flush) res.flush();
            }
          }
          
          if (res.flush) res.flush();
          
          if (responseCount % 10 === 0) {
            logger.debug(`Stream processing: ${responseCount} chunks`);
          }
        } catch (error) {
          logger.error({error: error.message}, 'Stream processing error');
        }
      });

      response.body.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
        logger.info(`AI streaming completed after ${responseCount} chunks`);
      });

      response.body.on('error', (error) => {
        logger.error({error: error.message}, 'Stream connection error');
        if (!res.headersSent) {
          res.status(500).send("Stream error");
        } else {
          res.end();
        }
      });
    } catch (error) {
      logger.error({error: error.message}, 'AI request error');
      if (!res.headersSent) {
        res.status(500).send(error.message);
      } else {
        res.end();
      }
    }
  });

  app.use((req, res) => {
    res.status(404).sendFile(join(__dirname, publicPath, "404.html"));
  });

  const server = createServer();

  server.on("request", (req, res) => {
    bare.shouldRoute(req) ? bare.routeRequest(req, res) : app(req, res);
  });

  server.on("upgrade", (req, socket, head) => {
    if (req.url.endsWith("/wisp/")) {
      wisp.routeRequest(req, socket, head);
    } else if (bare.shouldRoute(req)) {
      bare.routeUpgrade(req, socket, head);
    } else {
      socket.end();
    }
  });

  let port = parseInt(process.env.PORT || "");
  if (isNaN(port)) port = 8080;
  
  server.listen(port);

  server.on("listening", () => {
    const address = server.address();
    logger.info({port: address.port, workerId: process.pid}, 'Server listening');
  });

  const shutdown = () => {
    logger.info('Graceful shutdown initiated');
    server.close(() => {
      logger.info('HTTP server closed');
      bare.close();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}