import axios from "axios";
import { apiUrl } from "@/config/config";

const api = axios.create({
  baseURL: apiUrl,
});

type JwtPayload = {
  exp?: number;
};

const parseJwtPayload = (token: string): JwtPayload | null => {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return decoded as JwtPayload;
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
};

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(
  (config) => {
    if (typeof window === "undefined") {
      return config;
    }

    const token = localStorage.getItem("token");
    const requestUrl = String(config.url || "");
    const isLoginRequest = requestUrl.includes("/login");

    if (!token && !isLoginRequest) {
      window.location.href = "/login";
      return Promise.reject(new Error("No token in localStorage"));
    }

    if (token && isTokenExpired(token)) {
      localStorage.removeItem("token");
      if (!isLoginRequest) {
        window.location.href = "/login";
      }
      return Promise.reject(new Error("Token expired in client"));
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const isLoginRequest = requestUrl.includes("/login");

    if (status === 401 && !isLoginRequest && typeof window !== "undefined") {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
