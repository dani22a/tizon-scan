const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!backendUrl) {
  throw new Error("NEXT_PUBLIC_BACKEND_URL no está configurada");
}

export const apiUrl = backendUrl.replace(/\/$/, "");