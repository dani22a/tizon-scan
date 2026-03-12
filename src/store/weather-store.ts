import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GeoLocation, WeatherData } from "@/types/weather";
import {
  fetchGeoLocation,
  fetchPublicIp,
  fetchWeather,
} from "@/service/weather";

interface WeatherState {
  ip: string | null;
  geo: GeoLocation | null;
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  hydrate: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

function isCacheValid(lastFetchedAt: number | null): boolean {
  if (!lastFetchedAt) return false;
  return Date.now() - lastFetchedAt < CACHE_TTL_MS;
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      ip: null,
      geo: null,
      weather: null,
      loading: false,
      error: null,
      lastFetchedAt: null,

      hydrate: async () => {
        const state = get();

        // Si el cache es válido, no volver a consultar
        if (
          isCacheValid(state.lastFetchedAt) &&
          state.ip &&
          state.geo &&
          state.weather
        ) {
          return;
        }

        set({ loading: true, error: null });

        try {
          // Paso 1: obtener IP pública
          const ip = await fetchPublicIp();
          set({ ip });

          // Paso 2: geolocalización a partir de la IP
          const geo = await fetchGeoLocation(ip);
          set({ geo });

          // Paso 3: clima con lat/lon
          const weather = await fetchWeather(geo.lat, geo.lon);
          set({
            weather,
            lastFetchedAt: Date.now(),
            loading: false,
          });
        } catch (err: any) {
          set({
            error:
              err?.message || "Error al obtener datos de ubicación y clima",
            loading: false,
          });
        }
      },

      forceRefresh: async () => {
        // Invalidar cache y volver a consultar
        set({ lastFetchedAt: null });
        await get().hydrate();
      },
    }),
    {
      name: "weather-cache",
      partialize: (state) => ({
        ip: state.ip,
        geo: state.geo,
        weather: state.weather,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
