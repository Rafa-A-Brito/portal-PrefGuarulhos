import AdminConteudo from "../components/AdminConteudo";
import { exposicoesAdminApi } from "../../../services/conteudoApi";
export default function AdminExposicoes() {
  return <AdminConteudo tipo="exposicoes" api={exposicoesAdminApi} />;
}
