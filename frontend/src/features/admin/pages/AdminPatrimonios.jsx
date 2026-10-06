// [API DESATIVADA TEMPORARIAMENTE] dados em texto puro (db.json) só para visualizar a tela.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  ArchiveBoxArrowDownIcon,
  CheckBadgeIcon,
  PaperClipIcon,
  XMarkIcon,
  SparklesIcon,
  PencilSquareIcon,
  MapPinIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CATEGORIA_META } from "../../../features/categoriaMeta";
import { useAuth } from "../../../hooks/useAuth";
import { useErroModal } from "../../../hooks/useErroModal";
import {
  geocodificarEndereco,
  chaveEndereco,
  GEOCODING_EM_MODO_DEMO,
} from "../../../services/maps";
import {
  gerarResumoDeArquivo,
  validarArquivoResumo,
  EXTENSOES_RESUMO,
  IA_EM_MODO_DEMO,
} from "../../../services/gemini";
import { listarCategorias } from "../../../services/fakeApi";
import * as adminApi from "../../../services/adminApi";

// "descricao" no backend é texto livre (sem limite); este é só o limite do
// formulário. O campo "descricaoResumida" do backend aceita no máximo 500.
const LIMITE_RESUMO = 2000; // 2.000 caracteres (aprox. 300 palavras)
const LIMITE_RESUMO_CURTO = 500;
const MAX_CATEGORIAS_ADICIONAIS = 6;

const SITUACOES = [
  { valor: "NAO_INFORMADO", rotulo: "Não informada" },
  { valor: "PRESERVADO", rotulo: "Preservado" },
  { valor: "EM_RESTAURACAO", rotulo: "Em restauração" },
  { valor: "NECESSITA_RESTAURACAO", rotulo: "Necessita restauração" },
  { valor: "EM_RUINAS", rotulo: "Em ruínas" },
  { valor: "DEMOLIDO", rotulo: "Demolido" },
];

const ROTULO_STATUS = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  ARQUIVADO: "Arquivado",
};

const FORMULARIO_VAZIO = {
  nome: "",
  categoriaId: "",
  categoriasAdicionais: [],
  situacao: "NAO_INFORMADO",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  modoResumo: "escrever", // "escrever" | "arquivo"
  resumo: "",
  historia: "",
  importanciaCultural: "",
};

// "07162160" -> "07162-160" (aceita colar com ou sem traço)
function formatarCep(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

/** descricaoResumida (<= 500) derivada do resumo, cortando em fim de palavra. */
function resumoCurto(texto) {
  if (texto.length <= LIMITE_RESUMO_CURTO) return texto;

  const corte = texto.slice(0, LIMITE_RESUMO_CURTO - 1);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > 300 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

// Detalhe do backend (já normalizado por fakeApi) -> formulário plano.
// As coordenadas NÃO vão para o formulário: a pessoa nunca as vê nem as digita.
function paraFormulario(patrimonio) {
  return {
    ...FORMULARIO_VAZIO,
    nome: patrimonio.nome,
    categoriaId: patrimonio.categoriaId ?? "",
    categoriasAdicionais: patrimonio.categoriasAdicionaisIds ?? [],
    situacao: patrimonio.situacao ?? "NAO_INFORMADO",
    cep: patrimonio.cep || "",
    endereco: patrimonio.endereco || "",
    numero: patrimonio.numero || "",
    complemento: patrimonio.complemento || "",
    bairro: patrimonio.bairro || "",
    resumo: patrimonio.descricao || patrimonio.resumo || "",
    historia: patrimonio.historia || "",
    importanciaCultural: patrimonio.importanciaCultural || "",
  };
}

export default function AdminPatrimonios() {
  const { usuario } = useAuth();
  const { mostrarErro } = useErroModal();
  const eAdmin = usuario?.perfil === "ADMIN";

  const [patrimonios, setPatrimonios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // null = formulário fechado; "novo" = criando; senão, UUID do patrimônio.
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [etapaSalvando, setEtapaSalvando] = useState("");
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);

  // Coordenadas do patrimônio em edição e a "chave" do endereço com que
  // foram calculadas: endereço igual => reaproveita e não gasta geocodificação.
  const [coordenadas, setCoordenadas] = useState(null);
  const [chaveOriginal, setChaveOriginal] = useState("");

  const [erroArquivo, setErroArquivo] = useState(null);
  const [arquivoResumo, setArquivoResumo] = useState(null);
  const [gerando, setGerando] = useState(false);

  const inputArquivoRef = useRef(null);

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

  function reiniciarEstadosAuxiliares() {
    setErroFormulario(null);
    setErroArquivo(null);
    setArquivoResumo(null);
    setGerando(false);
  }

  function abrirNovo() {
    reiniciarEstadosAuxiliares();
    setFormulario({
      ...FORMULARIO_VAZIO,
      categoriaId: categorias[0]?.id ?? "",
    });
    setCoordenadas(null);
    setChaveOriginal("");
    setEditandoId("novo");
  }

  // A listagem não traz descricao/historia, então a edição busca o detalhe.
  async function abrirEdicao(resumo) {
    reiniciarEstadosAuxiliares();

    try {
      const detalhe = await adminApi.buscarPatrimonioAdmin(resumo.uuid);
      setFormulario(paraFormulario(detalhe));
      setCoordenadas(detalhe.localizacao ?? null);
      setChaveOriginal(chaveEndereco(detalhe));
      setEditandoId(detalhe.uuid);
    } catch (err) {
      mostrarErro(err, { origem: "AdminPatrimonios › abrirEdicao" });
    }
  }

  function fecharFormulario() {
    reiniciarEstadosAuxiliares();
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
    setCoordenadas(null);
    setChaveOriginal("");
    setEtapaSalvando("");
  }

  function cancelarFormulario() {
    fecharFormulario();
  }

  function atualizar(campo, valor) {
    setFormulario((f) => ({ ...f, [campo]: valor }));
  }

  // Trocar a principal tira essa categoria das adicionais (o backend recusa
  // a principal repetida entre as adicionais).
  function trocarCategoriaPrincipal(id) {
    setFormulario((f) => ({
      ...f,
      categoriaId: id,
      categoriasAdicionais: f.categoriasAdicionais.filter((c) => c !== id),
    }));
  }

  function alternarCategoriaAdicional(id) {
    setFormulario((f) => {
      const jaTem = f.categoriasAdicionais.includes(id);
      if (!jaTem && f.categoriasAdicionais.length >= MAX_CATEGORIAS_ADICIONAIS)
        return f;

      return {
        ...f,
        categoriasAdicionais: jaTem
          ? f.categoriasAdicionais.filter((c) => c !== id)
          : [...f.categoriasAdicionais, id],
      };
    });
  }

  // ===== Resumo: escrever ou enviar arquivo para a IA =====

  function escolherArquivoResumo(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";

    if (!arquivo) return;

    const problema = validarArquivoResumo(arquivo);

    if (problema) {
      setErroArquivo(problema);
      return;
    }

    setErroArquivo(null);
    setArquivoResumo(arquivo);
  }

  function removerArquivoResumo() {
    setArquivoResumo(null);
    setErroArquivo(null);
  }

  async function gerarResumo() {
    if (!arquivoResumo || gerando) return;

    setGerando(true);
    setErroFormulario(null);

    try {
      const texto = await gerarResumoDeArquivo(arquivoResumo, {
        limite: LIMITE_RESUMO,
      });
      atualizar("resumo", texto);
    } catch (err) {
      mostrarErro(err, {
        origem: "AdminPatrimonios › gerarResumo",
        mensagem: "Não foi possível gerar o resumo a partir do arquivo.",
      });
    } finally {
      setGerando(false);
    }
  }

  // ===== Salvar =====

  async function salvar(e) {
    e.preventDefault();
    setErroFormulario(null);

    const cepNumeros = formulario.cep.replace(/\D/g, "");

    if (cepNumeros.length !== 8) {
      setErroFormulario("Informe um CEP válido, com 8 dígitos.");
      return;
    }

    if (!formulario.categoriaId) {
      setErroFormulario("Escolha a categoria principal.");
      return;
    }

    if (!formulario.resumo.trim()) {
      setErroFormulario(
        formulario.modoResumo === "arquivo"
          ? "Anexe um arquivo e gere o resumo (ou escreva o texto) antes de salvar."
          : "Escreva o resumo do patrimônio.",
      );
      return;
    }

    setSalvando(true);

    try {
      // Coordenadas: só são calculadas com a geocodificação REAL ligada. No
      // modo demonstração elas são inventadas, e aqui o destino é o banco de
      // verdade, então simplesmente não são enviadas.
      let latitude;
      let longitude;

      if (!GEOCODING_EM_MODO_DEMO) {
        let ponto = coordenadas;
        const enderecoMudou = chaveEndereco(formulario) !== chaveOriginal;

        if (editandoId === "novo" || !ponto || enderecoMudou) {
          setEtapaSalvando("Localizando o endereço no mapa…");
          ponto = await geocodificarEndereco(formulario);
        }

        latitude = ponto.lat;
        longitude = ponto.lng;
      }

      setEtapaSalvando("Salvando…");

      // Campos opcionais vazios NÃO são enviados: o backend rejeita string
      // vazia (min 1) e campos desconhecidos (strictObject).
      const opcional = (valor) => {
        const texto = valor.trim();
        return texto ? texto : undefined;
      };
      const resumo = formulario.resumo.trim();

      const dados = {
        nome: formulario.nome.trim(),
        descricao: resumo,
        descricaoResumida: resumoCurto(resumo),
        categoriaId: formulario.categoriaId,
        categoriasAdicionais: formulario.categoriasAdicionais,
        situacao: formulario.situacao,
        historia: opcional(formulario.historia),
        importanciaCultural: opcional(formulario.importanciaCultural),
        localizacao: {
          endereco: formulario.endereco.trim(),
          numero: opcional(formulario.numero),
          complemento: opcional(formulario.complemento),
          bairro: formulario.bairro.trim(),
          cep: formulario.cep,
          ...(latitude !== undefined && { latitude, longitude }),
        },
      };

      if (editandoId === "novo") {
        await adminApi.criarPatrimonio(dados);
      } else {
        await adminApi.atualizarPatrimonio(editandoId, dados);
      }

      fecharFormulario();
      await carregarPatrimonios();
    } catch (err) {
      // 400 = dado recusado pelo backend: mensagem específica no formulário.
      if (err.response?.status === 400) {
        setErroFormulario(adminApi.extrairMensagemDeErro(err));
      } else {
        mostrarErro(err, {
          origem: "AdminPatrimonios › salvar",
          mensagem: "Não foi possível salvar o patrimônio.",
        });
      }
    } finally {
      setSalvando(false);
      setEtapaSalvando("");
    }
  }

  // ===== Publicar / arquivar (somente ADMIN) =====

  async function mudarStatus(patrimonio, acao) {
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

  // EDITOR só edita rascunho; ADMIN edita qualquer status.
  const podeEditar = (p) => eAdmin || p.status === "RASCUNHO";

  const modoArquivo = formulario.modoResumo === "arquivo";

  return (
    <div>
      <div className="admin-page-head admin-page-head-row">
        <div>
          <h1>Patrimônios</h1>
          <p>O site público mostra só os patrimônios publicados; novos cadastros começam como rascunho.</p>
        </div>

        <button type="button" className="btn-solid" onClick={abrirNovo}>
          <PlusIcon width={16} height={16} />
          Novo patrimônio
        </button>
      </div>

      {editandoId && (
        <form className="admin-form" onSubmit={salvar}>
          <h2>
            {editandoId === "novo" ? "Novo patrimônio" : "Editar patrimônio"}
          </h2>

          <div className="admin-form-grid">
            <label className="admin-form-col-2">
              Nome
              <input
                required
                value={formulario.nome}
                onChange={(e) => atualizar("nome", e.target.value)}
              />
            </label>

            <label>
              Categoria
              <select
                required
                value={formulario.categoriaId}
                onChange={(e) => trocarCategoriaPrincipal(e.target.value)}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Situação
              <select
                value={formulario.situacao}
                onChange={(e) => atualizar("situacao", e.target.value)}
              >
                {SITUACOES.map((sit) => (
                  <option key={sit.valor} value={sit.valor}>
                    {sit.rotulo}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="admin-form-col-2 admin-form-check-grid">
              <legend>
                Categorias adicionais (até {MAX_CATEGORIAS_ADICIONAIS}) — o bem
                também aparece nesses filtros
              </legend>
              {categorias
                .filter((c) => c.id !== formulario.categoriaId)
                .map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={formulario.categoriasAdicionais.includes(c.id)}
                      onChange={() => alternarCategoriaAdicional(c.id)}
                    />
                    {c.nome}
                  </label>
                ))}
            </fieldset>

            <label>
              Bairro
              <input
                required
                value={formulario.bairro}
                onChange={(e) => atualizar("bairro", e.target.value)}
              />
            </label>

            <label>
              CEP
              <input
                required
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={9}
                placeholder="00000-000"
                value={formulario.cep}
                onChange={(e) => atualizar("cep", formatarCep(e.target.value))}
              />
            </label>

            <label>
              Endereço
              <input
                required
                autoComplete="street-address"
                placeholder="Rua, avenida, praça..."
                value={formulario.endereco}
                onChange={(e) => atualizar("endereco", e.target.value)}
              />
            </label>

            <label>
              Número
              <input
                placeholder="Deixe em branco se for s/n"
                value={formulario.numero}
                onChange={(e) => atualizar("numero", e.target.value)}
              />
            </label>

            <label>
              Complemento
              <input
                value={formulario.complemento}
                onChange={(e) => atualizar("complemento", e.target.value)}
              />
            </label>

            <p className="admin-ajuda admin-form-col-2">
              <MapPinIcon width={16} height={16} />
              <span>
                Cidade: Guarulhos — SP. A posição no mapa é calculada
                automaticamente a partir do endereço quando você salva; não
                precisa informar latitude nem longitude.
                {GEOCODING_EM_MODO_DEMO &&
                  " (Geocodificação desligada: o patrimônio é salvo SEM coordenadas e não aparece no mapa até ela ser ativada.)"}
              </span>
            </p>

            <p className="admin-ajuda admin-form-col-2">
              <PaperClipIcon width={16} height={16} />
              <span>
                Imagens ainda não podem ser enviadas por aqui: a API não tem
                rota de upload.
              </span>
            </p>

            {/* ----- Resumo: escrever ou enviar arquivo ----- */}
            <div className="admin-form-col-2 admin-upload">
              <span className="admin-upload-rotulo">Resumo</span>

              <div
                className="admin-segmentado"
                role="tablist"
                aria-label="Como informar o resumo"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={!modoArquivo}
                  onClick={() => atualizar("modoResumo", "escrever")}
                >
                  <PencilSquareIcon width={15} height={15} />
                  Escrever
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modoArquivo}
                  onClick={() => atualizar("modoResumo", "arquivo")}
                >
                  <PaperClipIcon width={15} height={15} />
                  Enviar arquivo
                </button>
              </div>

              {modoArquivo && (
                <div className="admin-upload-linha admin-upload-bloco">
                  <input
                    ref={inputArquivoRef}
                    type="file"
                    accept={EXTENSOES_RESUMO.join(",")}
                    hidden
                    onChange={escolherArquivoResumo}
                  />

                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => inputArquivoRef.current?.click()}
                  >
                    <PaperClipIcon width={16} height={16} />
                    {arquivoResumo ? "Trocar arquivo" : "Anexar arquivo"}
                  </button>

                  <span className="admin-upload-nome">
                    {arquivoResumo?.name || ".txt, .md ou .pdf, até 5 MB"}
                  </span>

                  {arquivoResumo && (
                    <button
                      type="button"
                      className="admin-upload-remover"
                      aria-label="Remover arquivo"
                      onClick={removerArquivoResumo}
                    >
                      <XMarkIcon width={16} height={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-solid"
                    disabled={!arquivoResumo || gerando}
                    onClick={gerarResumo}
                  >
                    {gerando ? (
                      <ArrowPathIcon
                        width={16}
                        height={16}
                        className="icon-spin"
                      />
                    ) : (
                      <SparklesIcon width={16} height={16} />
                    )}
                    {gerando ? "Lendo o arquivo…" : "Gerar resumo com IA"}
                  </button>
                </div>
              )}

              {erroArquivo && <p className="admin-form-erro">{erroArquivo}</p>}

              {(!modoArquivo || formulario.resumo) && (
                <>
                  <textarea
                    rows={4}
                    style={{ resize: "none" }}
                    maxLength={LIMITE_RESUMO}
                    placeholder="Escreva um resumo curto do patrimônio."
                    value={formulario.resumo}
                    onChange={(e) => atualizar("resumo", e.target.value)}
                  />
                  <div className="admin-resumo-contador">
                    {formulario.resumo.length}/{LIMITE_RESUMO}
                  </div>
                </>
              )}

              {modoArquivo && (
                <p className="admin-aviso-ia">
                  A IA gera apenas um rascunho: leia e corrija o texto antes de
                  salvar.
                  {IA_EM_MODO_DEMO &&
                    " (Modo demonstração: a IA ainda não está ligada; .txt e .md mostram o início do próprio arquivo.)"}
                </p>
              )}
            </div>
            <label className="admin-form-col-2">
              História (opcional)
              <textarea
                rows={5}
                style={{ resize: "vertical" }}
                value={formulario.historia}
                onChange={(e) => atualizar("historia", e.target.value)}
              />
            </label>

            <label className="admin-form-col-2">
              Importância cultural (opcional)
              <textarea
                rows={4}
                style={{ resize: "vertical" }}
                value={formulario.importanciaCultural}
                onChange={(e) =>
                  atualizar("importanciaCultural", e.target.value)
                }
              />
            </label>
          </div>

          {erroFormulario && (
            <p className="admin-form-erro">{erroFormulario}</p>
          )}

          <div className="admin-form-acoes">
            <button type="submit" className="btn-solid" disabled={salvando}>
              {salvando ? (
                <>
                  <ArrowPathIcon width={16} height={16} className="icon-spin" />
                  {etapaSalvando || "Salvando…"}
                </>
              ) : (
                "Salvar"
              )}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={salvando}
              onClick={cancelarFormulario}
            >
              Cancelar
            </button>
          </div>
        </form>
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
        <table className="admin-table">
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
                <td>
                  <span className="admin-cat" data-cat={p.categoria}>
                    {CATEGORIA_META[p.categoria]?.label ?? p.categoria}
                  </span>
                </td>
                <td>{p.bairro || "—"}</td>
                <td>
                  <span className={`admin-status admin-status--${p.status}`}>
                    {ROTULO_STATUS[p.status] ?? p.status}
                  </span>
                </td>
                <td className="admin-table-acoes">
                  <button
                    type="button"
                    aria-label={`Editar ${p.nome}`}
                    title={
                      podeEditar(p)
                        ? undefined
                        : "Editores só podem editar rascunhos"
                    }
                    disabled={!podeEditar(p)}
                    onClick={() => abrirEdicao(p)}
                  >
                    <PencilIcon width={16} height={16} />
                  </button>

                  {eAdmin && p.status !== "PUBLICADO" && (
                    <button
                      type="button"
                      aria-label={`Publicar ${p.nome}`}
                      title="Publicar"
                      disabled={acaoEmAndamento === p.uuid}
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
                      disabled={acaoEmAndamento === p.uuid}
                      onClick={() => mudarStatus(p, "arquivar")}
                    >
                      <ArchiveBoxArrowDownIcon width={16} height={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
