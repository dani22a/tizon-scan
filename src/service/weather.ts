import axios from "axios";
import { GeoLocation, IpResponse, WeatherData } from "@/types/weather";

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY ?? "";

export async function fetchPublicIp(): Promise<string> {
  const { data } = await axios.get<IpResponse>(
    "https://api.ipify.org?format=json",
  );
  return data.ip;
}

export async function fetchGeoLocation(ip: string): Promise<GeoLocation> {
  const { data } = await axios.get<GeoLocation>(
    `http://ip-api.com/json/${ip}`,
  );
  return data;
}

export async function fetchWeather(
  lat: number,
  lon: number,
): Promise<WeatherData> {
  const { data } = await axios.get<WeatherData>(
    "https://api.openweathermap.org/data/3.0/onecall",
    {
      params: {
        lat,
        lon,
        units: "metric",
        lang: "es",
        exclude: "minutely",
        appid: OPENWEATHER_KEY,
      },
    },
  );
  return data;
}
