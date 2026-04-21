import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import type { IncomingMessage, ServerResponse } from "http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkAuth, authMiddleware } from "./middlewares/authMiddleware";
import { generalLimiter, authLimiter } from "./lib/rate-limit";

const app: Express = express();

// Trust the Railway / reverse-proxy X-Forwarded-For header.
// Required to avoid ERR_ERL_UNEXPECTED_X_FORWARDED_FOR from express-rate-limit.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
// Raw body for Stripe webhook signature verification
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkAuth);
app.use(authMiddleware);

app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api", router);

// In production, serve the built web app and fall back to index.html for SPA routing
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicPath = path.resolve(__dirname, "../../autohaul/dist/public");
  app.use(express.static(publicPath));
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

export default app;
