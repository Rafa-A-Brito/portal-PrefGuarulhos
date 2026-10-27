import api from "./api";

export async function buscarDashboard(signal) {
  const { data } = await api.get("/admin/dashboard", { signal });
  return data.data;
}

export async function buscarMetricasDashboard(filtros, signal) {
  const { data } = await api.get("/admin/dashboard/metricas", { params: filtros, signal });
  if (data.success !== true) throw new Error("Resposta de métricas inválida.");
  return data.data;
}

export async function buscarPatrimoniosMetricas(busca, signal) {
  const { data } = await api.get("/admin/patrimonios", { params: { ...(busca && { busca }), pagina: 1, limite: 20 }, signal });
  return data.data;
}
