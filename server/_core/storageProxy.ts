import type { Express } from "express";
import { storageGetSignedUrl } from "../storage.js";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Storage keys are opaque identifiers, never filesystem paths. Reject
    // traversal, encoded separators, and control characters before forwarding
    // anything to the storage provider.
    let decodedKey: string;
    try {
      decodedKey = decodeURIComponent(key);
    } catch {
      res.status(400).send("Invalid storage key");
      return;
    }
    if (decodedKey.includes("..") || decodedKey.includes("\\") || /[\u0000-\u001f]/.test(decodedKey)) {
      res.status(400).send("Invalid storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(decodedKey);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
