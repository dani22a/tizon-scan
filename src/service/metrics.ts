import api from "@/lib/axios";
import { MetricsResponse } from "@/types/metrics";

export const getMetrics = async (): Promise<MetricsResponse> => {
  const response = await api.get<MetricsResponse>("/metrics/data");
  return response.data;
};

export const getTrainHistory = async (): Promise<string> => {
  const response = await api.get("/train/history", { responseType: "blob" });
  return URL.createObjectURL(response.data);
};
