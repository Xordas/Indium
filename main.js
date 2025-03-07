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
    res: (res) => ({
      statusCode: res.statusCode
    }),
    err: pino.stdSerializers.err
  }
});

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
  app.use(express.json());

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
    res.setHeader(
      'Content-Security-Policy', 
      "frame-ancestors 'self' null about:blank;"
    );
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
      const { messages } = req.body;

      if (!Array.isArray(messages) || !messages.every(msg => 
        typeof msg.content === 'string' && 
        typeof msg.role === 'string' &&
        (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system')
      )) {
        res.status(400).send("Invalid input: messages must be an array with valid role and content properties");
        logger.warn('Invalid input format for AI predictions');
        return;
      }

      logger.info('Processing AI prediction request');

      const response = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "x-deepinfra-source": "web-embed"
        },
        body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          { role: "system", content: "You are an AI model named Llama developed by Meta. Your role is to assist users by providing helpful, professional, and respectful responses." },
          ...messages.map(msg => ({ role: msg.role, content: msg.content }))
        ],
        stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({
          statusCode: response.status,
          errorType: 'ai_provider_error'
        }, 'AI provider error');
        res.status(response.status).send(errorText);
        return;
      }
      
      logger.info('AI prediction streaming started');
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      response.body.pipe(res);
    } catch (error) {
      logger.error({
        error: error.message,
        errorType: 'ai_request_error'
      }, 'Error processing AI request');
      res.status(500).send(error.message);
    }
  });

  app.use((req, res) => {
    logger.info({path: req.path}, 'Not found - sending 404 page');
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

  server.on("listening", () => {
    const address = server.address();
    logger.info({
      port: address.port,
      workerId: process.pid
    }, 'Server listening');
  });

  const shutdown = () => {
    logger.info('Graceful shutdown initiated');
    server.close(() => {
      logger.info('HTTP server closed');
      bare.close();
      logger.info('Bare server closed');
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen({ port });
}