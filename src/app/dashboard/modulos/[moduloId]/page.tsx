import { redirect } from "next/navigation";

export default async function ModuloDetailPage({
  params,
}: {
  params: Promise<{ moduloId: string }>;
}) {
  const { moduloId } = await params;
  redirect(`/dashboard/modulos/${moduloId}/lotes`);
}
