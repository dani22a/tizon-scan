export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export interface MetricsData {
  class_names: string[];
  img_size: number;
  metrics_classifier: Record<string, ModelMetrics>;
  best_model: string;
  features_dataset: Record<string, number>;
}

export interface MetricsResponse {
  data: MetricsData;
  status: "success" | "error";
  message: string;
}
