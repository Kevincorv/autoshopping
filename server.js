const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let io;

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request", req.url, err);
        try {
          res.statusCode = 500;
          res.end("internal server error");
        } catch (_) {}
      }
    });

    io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      transports: ["websocket", "polling"],
    });

    globalThis.__io = io;

    io.on("connection", (socket) => {
      console.log("[socket] client connected", socket.id);
      socket.on("disconnect", () => {
        console.log("[socket] client disconnected", socket.id);
      });
    });

    server
      .once("error", (err) => {
        console.error("Server error", err);
        process.exit(1);
      })
      .listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Socket.io listening on same port`);
      });
  })
  .catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
  });

function emit(event, payload) {
  try {
    if (io) io.emit(event, payload);
  } catch (e) {
    console.error("Emit failed", event, e);
  }
}

globalThis.__emit = emit;
