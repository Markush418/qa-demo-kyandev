import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { health } from "./routes/health";
import { uploadRoute } from "./routes/upload";
import { chatRoute } from "./routes/chat";
import { documentsRoute } from "./routes/documents";

const app = new Hono();

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error", message: err.message }, 500);
});

app.route("/api/health", health);
app.route("/api/upload", uploadRoute);
app.route("/api/chat", chatRoute);
app.route("/api/documents", documentsRoute);

// En producción, el frontend ya viene buildeado a dist/client y se sirve estático
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist/client" }));
  app.get("*", serveStatic({ path: "./dist/client/index.html" }));
}

const port = Number(process.env.PORT) || 3000;

console.log(`Servidor escuchando en http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
