import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  ArchiveBoxArrowDownIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { CATEGORIA_META } from "../../../features/categoriaMeta";
import { useAuth } from "../../../hooks/useAuth";
import { useErroModal } from "../../../hooks/useErroModal";
import { listarCategorias } from "../../../services/patrimoniosApi";
import * as adminApi from "../../../services/adminApi";
import PatrimonioEditor from "../components/PatrimonioEditor";

const ROTULO_STATUS = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  ARQUIVADO: "Arquivado",
};

// O formulário de criação/edição vive em components/PatrimonioEditor.jsx e é o
// mesmo usado no modal da página pública de detalhe (D3E). Esta página cuida
// da lista, dos filtros/legenda, de publicar/arquivar e de abrir o editor.
export default function AdminPatrimonios() {
  const { usuario } = useAuth();
  const { mostrarErro } = useErroModal();
  const eAdmin = usuario?.perfil === "ADMIN";
  const podeEditar = (p) =>
    eAdmin || (usuario?.perfil === "EDITOR" && p.status === "RASCUNHO");

  const [patrimonios, setPatrimonios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // editor: null = fechado; senão { chave, idInicial } ("novo" ou UUID).
  // `chave` força um editor novo a cada abertura. `editandoId` acompanha o
  // UUID atual (muda quando um "novo" é criado e passa a ser edição).
  const [editor, setEditor] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [editorOcupado, setEditorOcupado] = useState(false);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);
  const [verificandoDestino, setVerificandoDestino] = useState(false);
  const pedidoDestino = useRef(0);
  const [erroAcao, setErroAcao] = useState(null);

  const ocupado = editorOcupado || verificandoDestino || acaoEmAndamento !== null;

  const contagemPorCategoria = useMemo(
    () =>
      patrimonios.reduce((acc, p) => {
        acc[p.categoria] = (acc[p.categoria] || 0) + 1;
        return acc;
      }, {}),
    [patrimonios],
  );

  async function carregarPatrimonios() {
    setCarregando(true);
    setErro(null);

    try {
      const [lista, cats] = await Promise.all([
        adminApi.listarPatrimoniosAdmin(),
        listarCategorias(),
      ]);
      setPatrimonios(lista);
      setCategorias(cats);
    } catch (err) {
      setErro("Não foi possível carregar os patrimônios.");
      mostrarErro(err, { origem: "AdminPatrimonios › carregar" });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarPatrimonios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirEditor(idInicial, detalheInicial = null) {
    pedidoDestino.current++;
    setErroAcao(null);
    setEditandoId(idInicial);
    setEditor((atual) => ({ chave: (atual?.chave ?? 0) + 1, idInicial, detalheInicial }));
  }

  function abrirNovo() {
    if (ocupado) return;
    abrirEditor("novo");
  }

  async function abrirEdicao(resumo) {
    if (ocupado) return;
    if (resumo.status && !podeEditar(resumo)) {
      setErroAcao("Editores só podem editar patrimônios em rascunho.");
      return;
    }

    // Ao mudar de patrimônio, não desmonte o formulário atual antes de
    // confirmar que o outro detalhe pode ser carregado. Em falhas de rede,
    // remoção ou permissão, preservamos inclusive edições e imagens locais.
    let detalhePrecarregado = null;
    if (editor && editandoId && editandoId !== resumo.uuid) {
      const pedido = ++pedidoDestino.current;
      setVerificandoDestino(true);
      try {
        const detalhe = await adminApi.buscarPatrimonioAdmin(resumo.uuid);
        if (pedido !== pedidoDestino.current) return;
        if (!podeEditar(detalhe)) {
          setErroAcao("Este patrimônio não está mais em rascunho. Somente ADMIN pode editá-lo.");
          return;
        }
        detalhePrecarregado = detalhe;
      } catch (err) {
        if (pedido !== pedidoDestino.current) return;
        setErroAcao(adminApi.extrairMensagemDeErro(err));
        mostrarErro(err, { origem: "AdminPatrimonios › abrir edição" });
        return;
      } finally {
        if (pedido === pedidoDestino.current) setVerificandoDestino(false);
      }
    }
    abrirEditor(resumo.uuid, detalhePrecarregado);
  }

  function fecharFormulario() {
    pedidoDestino.current++;
    setVerificandoDestino(false);
    setEditor(null);
    setEditandoId(null);
    setEditorOcupado(false);
  }

  useEffect(() => () => { pedidoDestino.current++; }, []);

  // Gravação principal concluída. Criar mantém o editor aberto (para enviar
  // imagens); atualizar fecha. Nos dois casos a lista é recarregada.
  function aoSalvar({ criado }) {
    if (!criado) fecharFormulario();
    void carregarPatrimonios();
  }

  // ===== Publicar / arquivar (somente ADMIN) =====

  async function mudarStatus(patrimonio, acao) {
    if (!eAdmin || ocupado) return;
    const publicar = acao === "publicar";
    const confirmou = window.confirm(
      publicar
        ? `Publicar "${patrimonio.nome}"? Ele passa a aparecer no site público.`
        : `Arquivar "${patrimonio.nome}"? Ele deixa de aparecer no site público.`,
    );
    if (!confirmou) return;

    setAcaoEmAndamento(patrimonio.uuid);

    try {
      if (publicar) await adminApi.publicarPatrimonio(patrimonio.uuid);
      else await adminApi.arquivarPatrimonio(patrimonio.uuid);

      if (editandoId === patrimonio.uuid) fecharFormulario();
      await carregarPatrimonios();
    } catch (err) {
      mostrarErro(err, {
        origem: `AdminPatrimonios › ${acao}`,
        mensagem: publicar
          ? "Não foi possível publicar. Confira se o cadastro está completo."
          : "Não foi possível arquivar o patrimônio.",
      });
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  return (
    <div>
      <div className="admin-page-head admin-page-head-row">
        <div>
          <h1>Patrimônios</h1>
          <p>
            O site público mostra só os patrimônios publicados; novos cadastros
            começam como rascunho.
          </p>
        </div>

        <button
          type="button"
          className="btn-solid"
          disabled={ocupado || carregando}
          onClick={abrirNovo}
        >
          <PlusIcon width={16} height={16} />
          Novo patrimônio
        </button>
      </div>

      {erroAcao && (
        <p className="admin-form-erro" role="alert">
          {erroAcao}
        </p>
      )}

      {editor && (
        <div inert={verificandoDestino} aria-busy={verificandoDestino}>
          <PatrimonioEditor
            key={editor.chave}
            idInicial={editor.idInicial}
            detalheInicial={editor.detalheInicial}
            categorias={categorias}
            onSaved={aoSalvar}
            onIdChange={setEditandoId}
            onCancel={fecharFormulario}
            onBusyChange={setEditorOcupado}
          />
        </div>
      )}

      {/* Legenda: cada categoria tem a sua cor (veja admin-extras.css) */}
      <div className="admin-cat-legenda" aria-label="Legenda das categorias">
        {categorias.map((c) => (
          <span key={c.id} className="admin-cat" data-cat={c.slug}>
            {c.nome} · {contagemPorCategoria[c.slug] || 0}
          </span>
        ))}
      </div>

      {carregando ? (
        <p className="empty-state">Carregando patrimônios...</p>
      ) : erro ? (
        <p className="empty-state">{erro}</p>
      ) : (
        <table className="admin-table admin-table--cards">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Bairro</th>
              <th>Status</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {patrimonios.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum patrimônio cadastrado.</td>
              </tr>
            )}
            {patrimonios.map((p) => (
              <tr key={p.uuid} data-cat={p.categoria}>
                <td>{p.nome}</td>
                <td data-label="Categoria">
                  <span className="admin-cat" data-cat={p.categoria}>
                    {CATEGORIA_META[p.categoria]?.label ?? p.categoria}
                  </span>
                </td>
                <td data-label="Bairro">{p.bairro || "—"}</td>
                <td data-label="Status">
                  <span className={`admin-status admin-status--${p.status}`}>
                    {ROTULO_STATUS[p.status] ?? p.status}
                  </span>
                </td>
                <td data-label="Ações">
                  <div className="admin-table-acoes">
                    <button
                      type="button"
                      aria-label={
                        podeEditar(p)
                          ? `Editar ${p.nome}`
                          : `Editar ${p.nome}: editores só podem editar rascunhos`
                      }
                      title={
                        podeEditar(p)
                          ? "Editar"
                          : "Editores só podem editar rascunhos"
                      }
                      disabled={!podeEditar(p) || ocupado}
                      onClick={() => abrirEdicao(p)}
                    >
                      <PencilIcon width={16} height={16} />
                    </button>

                    {eAdmin && p.status !== "PUBLICADO" && (
                      <button
                        type="button"
                        aria-label={`Publicar ${p.nome}`}
                        title="Publicar"
                        disabled={ocupado}
                        onClick={() => mudarStatus(p, "publicar")}
                      >
                        <CheckBadgeIcon width={16} height={16} />
                      </button>
                    )}

                    {eAdmin && p.status !== "ARQUIVADO" && (
                      <button
                        type="button"
                        aria-label={`Arquivar ${p.nome}`}
                        title="Arquivar"
                        disabled={ocupado}
                        onClick={() => mudarStatus(p, "arquivar")}
                      >
                        <ArchiveBoxArrowDownIcon width={16} height={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
