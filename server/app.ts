import express from "express";
import type { Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerGoogleOAuthRoutes } from "./_core/googleOAuth.js";
import { registerStorageProxy } from "./_core/storageProxy.js";
import { appRouter } from "./routers.js";
import { createContext } from "./_core/context.js";
import { rateLimit, requestId, securityHeaders } from "./_core/security.js";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(requestId);
  app.use(securityHeaders);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  registerStorageProxy(app);
  registerGoogleOAuthRoutes(app);
  app.use(
    "/api/trpc",
    rateLimit("trpc", 120),
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}

export async function createDevelopmentApp(): Promise<Express> {
  const app = createApp();
  const { serveStatic, setupVite } = await import("./_core/vite.js");
  if (process.env.NODE_ENV === "development") {
    const { createServer } = await import("http");
    await setupVite(app, createServer(app));
  } else {
    serveStatic(app);
  }
  return app;
}
