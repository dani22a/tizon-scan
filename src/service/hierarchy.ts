import api from "@/lib/axios";
import {
  ApiResponse,
  Lote,
  Modulo,
  Prediccion,
  Surco,
  CreateSurcoDiagnosisPayload,
  CreateLoteDiagnosisPayload,
  CreateModuloDiagnosisPayload,
  SurcoReportRecord,
  LoteReportRecord,
  ModuloReportRecord,
} from "@/types/hierarchy";

export const getModulos = async (): Promise<ApiResponse<Modulo[]>> => {
  const response = await api.get<ApiResponse<Modulo[]>>("/modulos");
  return response.data;
};

export const createModulo = async (
  nombre: string,
  descripcion: string,
): Promise<ApiResponse<Modulo>> => {
  const response = await api.post<ApiResponse<Modulo>>("/modulos", {
    nombre,
    descripcion: descripcion || null,
  });
  return response.data;
};

export const getModulo = async (
  moduloId: string,
): Promise<ApiResponse<Modulo>> => {
  const response = await api.get<ApiResponse<Modulo>>(`/modulos/${moduloId}`);
  return response.data;
};

export const getLotesByModulo = async (
  moduloId: string,
): Promise<ApiResponse<Lote[]>> => {
  const response = await api.get<ApiResponse<Lote[]>>(
    `/modulos/${moduloId}/lotes`,
  );
  return response.data;
};

export const createLote = async (
  moduloId: string,
  identificador: string,
  descripcion: string,
): Promise<ApiResponse<Lote>> => {
  const response = await api.post<ApiResponse<Lote>>(
    `/modulos/${moduloId}/lotes`,
    {
      identificador,
      descripcion: descripcion || null,
    },
  );
  return response.data;
};

export const getSurcosByLote = async (
  moduloId: string,
  loteId: string,
): Promise<ApiResponse<Surco[]>> => {
  const response = await api.get<ApiResponse<Surco[]>>(
    `/modulos/${moduloId}/lotes/${loteId}/surcos`,
  );
  return response.data;
};

export const createSurco = async (
  moduloId: string,
  loteId: string,
  numero: number,
  descripcion: string,
): Promise<ApiResponse<Surco>> => {
  const response = await api.post<ApiResponse<Surco>>(
    `/modulos/${moduloId}/lotes/${loteId}/surcos`,
    {
      numero,
      descripcion: descripcion || null,
    },
  );
  return response.data;
};

export const getPrediccionesBySurco = async (
  moduloId: string,
  loteId: string,
  surcoId: string,
): Promise<ApiResponse<Prediccion[]>> => {
  const response = await api.get<ApiResponse<Prediccion[]>>(
    `/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/predicciones`,
  );
  return response.data;
};

export const getPrediccionById = async (
  moduloId: string,
  loteId: string,
  surcoId: string,
  prediccionId: string,
): Promise<ApiResponse<Prediccion>> => {
  const response = await api.get<ApiResponse<Prediccion>>(
    `/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/predicciones/${prediccionId}`,
  );
  return response.data;
};

export const evaluarSurco = async (
  moduloId: string,
  loteId: string,
  surcoId: string,
  image: File,
): Promise<ApiResponse<Prediccion>> => {
  const formData = new FormData();
  formData.append("file", image);

  const response = await api.post<ApiResponse<Prediccion>>(
    `/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/predicciones/evaluar`,
    formData,
  );

  return response.data;
};

// ── Diagnóstico espacial ──────────────────────────────────────────

export const createSurcoDiagnosis = async (
  moduloId: string,
  loteId: string,
  surcoId: string,
  payload: CreateSurcoDiagnosisPayload,
): Promise<ApiResponse<SurcoReportRecord>> => {
  const response = await api.post<ApiResponse<SurcoReportRecord>>(
    `/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/diagnosis`,
    payload,
  );
  return response.data;
};

export const getSurcoDiagnosisHistory = async (
  moduloId: string,
  loteId: string,
  surcoId: string,
): Promise<ApiResponse<SurcoReportRecord[]>> => {
  const response = await api.get<ApiResponse<SurcoReportRecord[]>>(
    `/modulos/${moduloId}/lotes/${loteId}/surcos/${surcoId}/diagnosis`,
  );
  return response.data;
};

export const createLoteDiagnosis = async (
  moduloId: string,
  loteId: string,
  payload: CreateLoteDiagnosisPayload,
): Promise<ApiResponse<LoteReportRecord>> => {
  const response = await api.post<ApiResponse<LoteReportRecord>>(
    `/modulos/${moduloId}/lotes/${loteId}/diagnosis`,
    payload,
  );
  return response.data;
};

export const getLoteDiagnosisHistory = async (
  moduloId: string,
  loteId: string,
): Promise<ApiResponse<LoteReportRecord[]>> => {
  const response = await api.get<ApiResponse<LoteReportRecord[]>>(
    `/modulos/${moduloId}/lotes/${loteId}/diagnosis`,
  );
  return response.data;
};

export const createModuloDiagnosis = async (
  moduloId: string,
  payload: CreateModuloDiagnosisPayload,
): Promise<ApiResponse<ModuloReportRecord>> => {
  const response = await api.post<ApiResponse<ModuloReportRecord>>(
    `/modulos/${moduloId}/diagnosis`,
    payload,
  );
  return response.data;
};

export const getModuloDiagnosisHistory = async (
  moduloId: string,
): Promise<ApiResponse<ModuloReportRecord[]>> => {
  const response = await api.get<ApiResponse<ModuloReportRecord[]>>(
    `/modulos/${moduloId}/diagnosis`,
  );
  return response.data;
};
