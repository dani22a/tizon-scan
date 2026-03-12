import { redirect } from "next/navigation";

export default async function LoteDetailPage({
  params,
}: {
  params: Promise<{ moduloId: string; loteId: string }>;
}) {
  const { moduloId, loteId } = await params;
  redirect(`/dashboard/modulos/${moduloId}/lotes/${loteId}/surcos`);
}
