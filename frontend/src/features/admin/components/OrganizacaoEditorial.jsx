import { useEffect, useState } from "react";
import { listarRegioesAtivasAdmin, erroRegiao } from "../../../services/regioesApi";
import "./OrganizacaoEditorial.css";

export default function OrganizacaoEditorial({ formulario, atualizar }) {
  const [regioes, setRegioes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    listarRegioesAtivasAdmin(controller.signal).then(rows => {
      if (!controller.signal.aborted) { setRegioes(rows); setErro(""); }
    }).catch(error => {
      if (!controller.signal.aborted) setErro(erroRegiao(error));
    }).finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [tentativa]);
  const atual = formulario.regiaoAtual;
  const foraDoCatalogo = atual && !regioes.some(r => r.id === atual.id);
  return <fieldset className="admin-form-col-2 organizacao-editorial">
    <legend>Organização editorial</legend>
    <p className="admin-ajuda">Classificação e apresentação no portal. Estes campos não alteram o endereço ou a rota.</p>
    <label>Região
      <select value={formulario.regiaoId} onChange={e => atualizar("regiaoId", e.target.value)} disabled={carregando || !!erro}>
        <option value="">Não informada</option>
        {foraDoCatalogo && <option value={atual.id} disabled>{atual.nome} ({atual.ativo === false ? "inativa — vínculo atual" : "vínculo atual"})</option>}
        {regioes.map(r => <option key={r.id} value={r.id}>{r.nome} — {r.slug}</option>)}
      </select>
    </label>
    {carregando && <p role="status">Carregando regiões…</p>}
    {!carregando && !erro && regioes.length === 0 && <p>Nenhuma região ativa cadastrada. A classificação pode ficar vazia.</p>}
    {erro && <div role="alert">{erro} <button type="button" onClick={() => { setCarregando(true); setTentativa(t => t + 1); }}>Tentar carregar regiões novamente</button></div>}
    <label>Número de exibição
      <input type="number" min="1" max="2147483647" step="1" value={formulario.numeroExibicao} onChange={e => atualizar("numeroExibicao", e.target.value)} aria-describedby="numero-editorial-ajuda" />
    </label>
    <p id="numero-editorial-ajuda" className="admin-ajuda">Número apresentado ao visitante. Não é o número do endereço. Deixe vazio para não exibir.</p>
    <label>Ordem de exibição
      <input type="number" min="0" max="2147483647" step="1" value={formulario.ordemExibicao} onChange={e => atualizar("ordemExibicao", e.target.value)} aria-describedby="ordem-editorial-ajuda" />
    </label>
    <p id="ordem-editorial-ajuda" className="admin-ajuda">Menores valores aparecem primeiro; zero é válido. Empates usam nome. Vazio mantém a ordenação por nome após os itens priorizados.</p>
  </fieldset>;
}
