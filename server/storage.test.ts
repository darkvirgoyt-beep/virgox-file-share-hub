import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageGetSignedUrl, storagePut } from "./storage.js";
import { registerStorageProxy } from "./_core/storageProxy.js";

vi.hoisted(() => {
  process.env.BUILT_IN_FORGE_API_URL = "https://forge.example.test";
  process.env.BUILT_IN_FORGE_API_KEY = "test-key";
});

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, statusText: ok ? "OK" : "Bad Gateway", json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)) };
}

describe("secure storage pipeline", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("presigns and uploads with a generated object key", async () => {
    fetchMock.mockResolvedValueOnce(response({ url: "https://s3.example.test/upload" }));
    fetchMock.mockResolvedValueOnce(response({}));

    const result = await storagePut("private/report.txt", "hello", "text/plain");

    expect(result.key).toMatch(/^private\/report_[a-f0-9]{8}\.txt$/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0].toString()).toContain("v1/storage/presign/put");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-key");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT", headers: { "Content-Type": "text/plain" } });
  });

  it.each(["../secret.txt", "folder/%2e%2e/secret.txt", "folder\\secret.txt", "folder/%00.txt", "a".repeat(501)])("rejects unsafe key %s before network access", async (key) => {
    await expect(storagePut(key, "data")).rejects.toThrow("Invalid storage key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a signed download URL only after the provider responds", async () => {
    fetchMock.mockResolvedValueOnce(response({ url: "https://s3.example.test/download?token=short" }));
    await expect(storageGetSignedUrl("private/report.txt")).resolves.toBe("https://s3.example.test/download?token=short");
    expect(fetchMock.mock.calls[0][0].toString()).toContain("v1/storage/presign/get");
  });

  it("blocks traversal at the storage proxy without contacting Forge", async () => {
    let handler: (req: any, res: any) => Promise<void> = async () => undefined;
    registerStorageProxy({ get: (_path: string, callback: typeof handler) => { handler = callback; } } as any);
    const send = vi.fn();
    const res = { status: vi.fn().mockReturnThis(), send };

    await handler({ params: { 0: "folder/%2e%2e/secret.txt" } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("Invalid storage key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects authorized provider URLs without exposing provider errors", async () => {
    fetchMock.mockResolvedValueOnce(response({ url: "https://s3.example.test/download" }));
    let handler: (req: any, res: any) => Promise<void> = async () => undefined;
    registerStorageProxy({ get: (_path: string, callback: typeof handler) => { handler = callback; } } as any);
    const res = { set: vi.fn(), redirect: vi.fn() };

    await handler({ params: { 0: "private/report.txt" } }, res);

    expect(res.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.redirect).toHaveBeenCalledWith(307, "https://s3.example.test/download");
  });
});
