import "server-only";
import { cookies as requestCookies } from "next/headers";
import { currentUser } from "@/lib/api";
const namespace = "/api/tools/inventory-admin";
// Source components need a truthy legacy token flag. Real session cookies stay on the server.
export async function cookies() {
  const user = await currentUser();
  return { get: (name: string) => name === "token" && user ? { name, value: "margyn-inventory-session" } : undefined };
}
export async function inventoryFetch(input: RequestInfo | URL, options: RequestInit = {}) {
  if (typeof input !== "string" || !input.startsWith(namespace + "/")) throw new Error("Unknown inventory API path.");
  const headers = new Headers(options.headers);
  headers.delete("Authorization");
  headers.set("Cookie", (await requestCookies()).toString());
  const backend = (process.env.BACKEND_URL || "https://margyn-backend.onrender.com").replace(/\/$/, "");
  return globalThis.fetch(backend + input, { ...options, headers, cache: "no-store" });
}
