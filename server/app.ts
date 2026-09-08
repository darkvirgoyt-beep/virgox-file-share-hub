import express from "express";
import type { Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerGoogleOAuthRoutes } from "./_core/googleOAuth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { serveStatic, setupVite } from "./_core/vite";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerGoogleOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}

export async function createDevelopmentApp(): Promise<Express> {
  const app = createApp();
  if (process.env.NODE_ENV === "development") {
    const { createServer } = await import("http");
    await setupVite(app, createServer(app));
  } else {
    serveStatic(app);
  }
  return app;
}
