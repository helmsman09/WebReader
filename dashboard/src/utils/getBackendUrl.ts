const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://192.168.1.216:4000";

export function getBackendUrl(): string {
  if (!BACKEND_URL) {
    throw new Error("EXPO_PUBLIC_BACKEND_URL is not defined");
  }
  return BACKEND_URL;
}