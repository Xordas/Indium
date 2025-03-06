import wisp from "wisp-server-node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import fetch from "node-fetch";
const bare = createBareServer("/bare/");
const __dirname = join(fileURLToPath(import.meta.url), "..");
const app = express();
const publicPath = "public";

app.use(express.json());

app.use(express.static(publicPath));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/baremod/", express.static(bareModulePath));

app.use("/loading", (req, res) => {
  res.sendFile(join(__dirname, publicPath, "loading.html"));
});

app.use("/apps", (req, res) => {
  res.sendFile(join(__dirname, publicPath, "apps.html"));
});

app.use("/games", (req, res) => {
  res.sendFile(join(__dirname, publicPath, "games.html"));
});

app.use("/settings", (req, res) => {
  res.sendFile(join(__dirname, publicPath, "settings.html"));
});

app.use("/ai", (req, res) => {
  res.sendFile(join(__dirname, publicPath, "ai.html"));
});

app.use("/credits", (req, res) => {
  res.sendFile(join(__dirname, publicPath, "credits.html"));
});

app.use("/api/apps", (req, res) => {
  res.sendFile(join(__dirname, "appsgames", "apps.json"));
});

app.use("/api/games", (req, res) => {
  res.sendFile(join(__dirname, "appsgames", "games.json"));
});

app.use("/api/predictions", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || !messages.every(msg => 
      typeof msg.content === 'string' && 
      typeof msg.role === 'string' &&
      (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system')
    )) {
      res.status(400).send("Invalid input: messages must be an array with valid role and content properties");
      return;
    }

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
      res.status(response.status).send(await response.text());
      return;
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.body.pipe(res);
  } catch (error) {
    res.status(500).send(error.message);
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

server.on("listening", () => {
  const address = server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`);
});

const shutdown = () => {
  console.log("Closing HTTP server");
  server.close();
  bare.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);



server.listen({ port });