import AdminConteudo from "../components/AdminConteudo";
import { novidadesAdminApi } from "../../../services/conteudoApi";
export default function AdminNovidades() {
  return <AdminConteudo tipo="novidades" api={novidadesAdminApi} />;
}
