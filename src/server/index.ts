import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { health } from "./routes/health";
import { uploadRoute } from "./routes/upload";
import { chatRoute } from "./routes/chat";
import { documentsRoute } from "./routes/documents";
import { suggestRoute } from "./routes/suggest";
import { rateLimit } from "./middleware/rateLimit";
import { cleanupExpiredDocuments } from "./utils/cleanup";

const app = new Hono();

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error", message: err.message }, 500);
});

// Rate limiting: upload más estricto (caro), chat más permisivo
app.use("/api/upload/*", rateLimit(5, 10 * 60 * 1000));   // 5 uploads / 10 min
app.use("/api/chat/*",   rateLimit(30, 60 * 1000));        // 30 mensajes / min
app.use("/api/suggest/*", rateLimit(10, 60 * 1000));       // 10 sugerencias / min

app.route("/api/health", health);
app.route("/api/upload", uploadRoute);
app.route("/api/chat", chatRoute);
app.route("/api/suggest", suggestRoute);
app.route("/api/documents", documentsRoute);

// En producción, el frontend ya viene buildeado a dist/client y se sirve estático
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist/client" }));
  app.get("*", serveStatic({ path: "./dist/client/index.html" }));
}

// Limpieza de documentos expirados: al arrancar y luego cada hora
cleanupExpiredDocuments().catch(console.error);
setInterval(() => cleanupExpiredDocuments().catch(console.error), 60 * 60 * 1000);

const port = Number(process.env.PORT) || 3000;

console.log(`Servidor escuchando en http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
