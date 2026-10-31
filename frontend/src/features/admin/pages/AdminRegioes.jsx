import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
  listarRegioesAdmin,
  criarRegiao,
  atualizarRegiao,
  erroRegiao,
} from "../../../services/regioesApi";
import "./AdminRegioes.css";

const vazio = { nome: "", slug: "", descricao: "", ativo: true };
export default function AdminRegioes() {
  const { usuario } = useAuth();
  const admin = usuario?.perfil === "ADMIN";
  const [lista, setLista] = useState({
    itens: [],
    paginacao: { totalPaginas: 0 },
  });
  const [busca, setBusca] = useState("");
  const [consulta, setConsulta] = useState({ busca: "", pagina: 1 });
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [editando, setEditando] = useState(null);
  const [dados, setDados] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const nomeRef = useRef(null);
  useEffect(() => {
    if (!admin) return;
    const abort = new AbortController();
    listarRegioesAdmin(
      { ...consulta, busca: consulta.busca || undefined, limite: 20 },
      abort.signal,
    )
      .then((result) => {
        if (!abort.signal.aborted) {
          setLista(result);
          setErro("");
          setBloqueado(false);
        }
      })
      .catch((error) => {
        if (!abort.signal.aborted) {
          setErro(erroRegiao(error));
          setBloqueado(true);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setCarregando(false);
      });
    return () => abort.abort();
  }, [consulta, versao, admin]);
  useEffect(() => {
    if (editando) nomeRef.current?.focus();
  }, [editando]);
  function carregar() {
    setCarregando(true);
    setVersao((v) => v + 1);
  }
  async function salvar(event) {
    event.preventDefault();
    if (salvando || bloqueado) return;
    setSalvando(true);
    setErro("");
    setSucesso("");
    try {
      const body = {
        nome: dados.nome.trim(),
        descricao: dados.descricao.trim() || null,
        ativo: dados.ativo,
      };
      if (editando === "nova")
        await criarRegiao({ ...body, slug: dados.slug.trim() });
      else await atualizarRegiao(editando, body);
      setEditando(null);
      setSucesso("Região salva. Os vínculos existentes foram preservados.");
      carregar();
    } catch (error) {
      setErro(erroRegiao(error));
      if ([401, 403, 404, 409].includes(error.response?.status))
        setBloqueado(true);
    } finally {
      setSalvando(false);
    }
  }
  if (!admin)
    return (
      <p role="alert">Somente ADMIN pode administrar o catálogo de regiões.</p>
    );
  return (
    <section className="admin-regioes" aria-labelledby="titulo-regioes">
      <h1 id="titulo-regioes">Regiões</h1>
      <p>
        Catálogo de classificação dos patrimônios. Cadastre somente referências
        validadas documentalmente.
      </p>
      <form
        className="admin-regioes-busca"
        onSubmit={(e) => {
          e.preventDefault();
          setCarregando(true);
          setConsulta({ busca: busca.trim(), pagina: 1 });
        }}
      >
        <label>
          Buscar região
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={100}
          />
        </label>
        <button disabled={salvando} type="submit" className="btn-outline">
          Buscar
        </button>
      </form>
      <div className="admin-regioes-acoes">
        <button
          type="button"
          className="btn-solid"
          disabled={carregando || salvando || bloqueado}
          onClick={() => {
            setDados(vazio);
            setEditando("nova");
            setSucesso("");
          }}
        >
          Nova região
        </button>
        <button
          type="button"
          className="btn-outline"
          disabled={salvando}
          onClick={carregar}
        >
          Atualizar regiões
        </button>
      </div>
      {erro && <p role="alert">{erro}</p>}
      {sucesso && <p role="status">{sucesso}</p>}
      {carregando && <p role="status">Carregando regiões…</p>}
      {editando && (
        <form className="admin-form" onSubmit={salvar}>
          <h2>{editando === "nova" ? "Nova região" : "Editar região"}</h2>
          <fieldset
            disabled={salvando || bloqueado}
            className="admin-regioes-campos"
          >
            <legend>Dados da região</legend>
            <label>
              Nome da região
              <input
                ref={nomeRef}
                required
                maxLength={100}
                value={dados.nome}
                onChange={(e) => setDados({ ...dados, nome: e.target.value })}
              />
            </label>
            {editando === "nova" ? (
              <label>
                Slug
                <input
                  required
                  maxLength={120}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={dados.slug}
                  onChange={(e) => setDados({ ...dados, slug: e.target.value })}
                  aria-describedby="ajuda-slug-regiao"
                />
              </label>
            ) : (
              <p>Slug: {dados.slug}</p>
            )}
            <p id="ajuda-slug-regiao">
              Identificador público com letras minúsculas, números e hífens.
              Permanece estável após criar.
            </p>
            <label>
              Descrição e referência documental
              <textarea
                maxLength={2000}
                rows={4}
                value={dados.descricao}
                onChange={(e) =>
                  setDados({ ...dados, descricao: e.target.value })
                }
              />
            </label>
            <label className="admin-regioes-check">
              <input
                type="checkbox"
                checked={dados.ativo}
                onChange={(e) =>
                  setDados({ ...dados, ativo: e.target.checked })
                }
              />
              Região ativa
            </label>
            <p>
              Inativar impede novas atribuições e preserva os vínculos
              existentes.
            </p>
            <button type="submit" className="btn-solid">
              {salvando ? "Salvando…" : "Salvar região"}
            </button>
          </fieldset>
          <button
            type="button"
            className="btn-outline"
            disabled={salvando}
            onClick={() => setEditando(null)}
          >
            Cancelar
          </button>
        </form>
      )}
      {!carregando && !erro && lista.itens.length === 0 && (
        <p>Nenhuma região encontrada. O catálogo pode permanecer vazio.</p>
      )}
      <ul className="admin-regioes-lista">
        {lista.itens.map((r) => (
          <li key={r.id}>
            <h2>{r.nome}</h2>
            <p>
              {r.ativo ? "Ativa" : "Inativa"} · {r.slug}
            </p>
            {r.descricao && <p>{r.descricao}</p>}
            <button
              type="button"
              className="btn-outline"
              disabled={salvando || carregando || bloqueado}
              aria-label={`Editar região ${r.nome}`}
              onClick={() => {
                setDados({ ...r, descricao: r.descricao ?? "" });
                setEditando(r.id);
                setSucesso("");
              }}
            >
              Editar região
            </button>
          </li>
        ))}
      </ul>
      <nav aria-label="Paginação das regiões" className="admin-regioes-acoes">
        <button
          type="button"
          disabled={consulta.pagina <= 1 || carregando || salvando}
          onClick={() => {
            setCarregando(true);
            setConsulta({ ...consulta, pagina: consulta.pagina - 1 });
          }}
        >
          Anterior
        </button>
        <span>
          Página {consulta.pagina} de{" "}
          {Math.max(1, lista.paginacao.totalPaginas)}
        </span>
        <button
          type="button"
          disabled={
            consulta.pagina >= lista.paginacao.totalPaginas ||
            carregando ||
            salvando
          }
          onClick={() => {
            setCarregando(true);
            setConsulta({ ...consulta, pagina: consulta.pagina + 1 });
          }}
        >
          Próxima
        </button>
      </nav>
    </section>
  );
}
