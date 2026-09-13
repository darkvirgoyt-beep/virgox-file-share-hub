import crypto from "node:crypto";
import { ENV } from "./_core/env.js";

function normalizeKey(relKey: string): string {
  let key: string;
  try { key = decodeURIComponent(relKey).replace(/^\/+/, ""); } catch { throw new Error("Invalid storage key"); }
  if (!key || key.length > 500 || key.includes("\\") || /[\u0000-\u001f]/.test(key) || key.split("/").some((part) => part === "..")) throw new Error("Invalid storage key");
  return key;
}
function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
function hasSupabase() { return Boolean(ENV.supabaseUrl && ENV.supabaseServiceRoleKey); }
function supabaseHeaders() { return { Authorization: `Bearer ${ENV.supabaseServiceRoleKey}`, apikey: ENV.supabaseServiceRoleKey }; }
function bucketUrl(path: string) { return `${ENV.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${ENV.supabaseStorageBucket}/${path}`; }

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (hasSupabase()) {
    const response = await fetch(bucketUrl(key), { method: "POST", headers: { ...supabaseHeaders(), "Content-Type": contentType, "x-upsert": "true" }, body: typeof data === "string" ? data : new Uint8Array(data) });
    if (!response.ok) throw new Error(`Supabase storage upload failed (${response.status})`);
    return { key, url: `/manus-storage/${key}` };
  }
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new Error("Storage config missing: configure Supabase Storage or Manus Forge");
  const presignUrl = new URL("v1/storage/presign/put", ENV.forgeApiUrl.replace(/\/$/, "") + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
  if (!presignResp.ok) throw new Error(`Storage presign failed (${presignResp.status})`);
  const { url: s3Url } = await presignResp.json() as { url: string };
  const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType }, body: typeof data === "string" ? data : new Uint8Array(data) });
  if (!uploadResp.ok) throw new Error(`Storage upload failed (${uploadResp.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string) { const key = normalizeKey(relKey); return { key, url: `/manus-storage/${key}` }; }

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (hasSupabase()) {
    const response = await fetch(`${ENV.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/sign/${ENV.supabaseStorageBucket}/${key}`, { method: "POST", headers: { ...supabaseHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3600 }) });
    if (!response.ok) throw new Error(`Supabase signed URL failed (${response.status})`);
    const { signedURL, signedUrl } = await response.json() as { signedURL?: string; signedUrl?: string };
    const value = signedURL || signedUrl;
    if (!value) throw new Error("Supabase returned an empty signed URL");
    return value.startsWith("http") ? value : `${ENV.supabaseUrl.replace(/\/$/, "")}/storage/v1${value}`;
  }
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new Error("Storage config missing: configure Supabase Storage or Manus Forge");
  const getUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/$/, "") + "/");
  getUrl.searchParams.set("path", key);
  const response = await fetch(getUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
  if (!response.ok) throw new Error(`Storage signed URL failed (${response.status})`);
  return (await response.json() as { url: string }).url;
}
