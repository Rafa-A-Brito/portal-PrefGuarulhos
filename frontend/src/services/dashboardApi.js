import api from "./api";

export async function buscarDashboard(signal) {
  const { data } = await api.get("/admin/dashboard", { signal });
  return data.data;
}
