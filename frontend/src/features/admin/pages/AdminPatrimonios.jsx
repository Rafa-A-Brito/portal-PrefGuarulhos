// [API DESATIVADA TEMPORARIAMENTE] dados em texto puro (db.json) só para visualizar a tela.
import { useEffect, useMemo, useRef, useState } from "react";
// import { useEffect, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PaperClipIcon,
  XMarkIcon,
  SparklesIcon,
  PencilSquareIcon,
  MapPinIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  CATEGORIA_META,
  CATEGORIAS_ORDEM,
} from "../../../features/categoriaMeta";
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
// import { listarPatrimonios } from "../../../services/fakeApi";
// import * as adminApi from "../../../services/adminApi";

// Ajustar ao limite real do campo "descricao" quando a equipe confirmar.
const LIMITE_RESUMO = 600;

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAX_IMAGEM = 5 * 1024 * 1024; // 5 MB

const FORMULARIO_VAZIO = {
  nome: "",
  categoria: CATEGORIAS_ORDEM[0],
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  imagemPrincipal: "",
  imagemNome: "",
  modoResumo: "escrever", // "escrever" | "arquivo"
  resumo: "",
};

// Patrimônios do db.json em texto puro, no mesmo formato que a API devolve.
// Os endereços e CEPs vêm do init.sql do projeto.
const PATRIMONIOS_MOCK = [
  {
    id: "1",
    nome: "Capela de Nossa Senhora do Bonsucesso",
    categoria: "arquitetonico",
    bairro: "Bonsucesso",
    endereco: "Rua Silva Bueno",
    numero: "",
    complemento: "",
    cep: "07162-160",
    resumo:
      "Construção histórica datada de meados do século XVIII, ponto central da tradicional Festa de Bonsucesso.",
    imagemPrincipal: "/src/assets/sra_bonsucesso.png",
    localizacao: { lat: -23.4182, lng: -46.4111 },
  },
  {
    id: "2",
    nome: "Bosque Maia",
    categoria: "natural",
    bairro: "Jardim Maia",
    endereco: "Rua Alberto Byington",
    numero: "",
    complemento: "",
    cep: "07097-030",
    resumo:
      "Maior parque urbano de Guarulhos, considerado o pulmão verde do município e espaço de convivência.",
    imagemPrincipal: "/src/assets/bosque_maia.jpg",
    localizacao: { lat: -23.4565, lng: -46.5292 },
  },
  {
    id: "3",
    nome: "Festa de Bonsucesso",
    categoria: "imaterial",
    bairro: "Bonsucesso",
    endereco: "Rua Silva Bueno",
    numero: "",
    complemento: "",
    cep: "07162-160",
    resumo:
      "Uma das manifestações religiosas e culturais mais antigas da Região Metropolitana de São Paulo.",
    imagemPrincipal: "/src/assets/fest_bonsucesso.jpg",
    localizacao: { lat: -23.419, lng: -46.4105 },
  },
];

// "07162160" -> "07162-160" (aceita colar com ou sem traço)
function formatarCep(valor) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

function nomeDoArquivo(url) {
  return url ? url.split("/").pop() : "";
}

// Transforma o patrimônio que veio da API (com localizacao.lat/lng) no
// formato "plano" que o formulário usa. As coordenadas NÃO vão para o
// formulário: a pessoa nunca as vê nem as digita (veja salvar).
function paraFormulario(patrimonio) {
  return {
    ...FORMULARIO_VAZIO,
    nome: patrimonio.nome,
    categoria: patrimonio.categoria,
    cep: patrimonio.cep || "",
    endereco: patrimonio.endereco || "",
    numero: patrimonio.numero || "",
    complemento: patrimonio.complemento || "",
    bairro: patrimonio.bairro,
    imagemPrincipal: patrimonio.imagemPrincipal || "",
    imagemNome: nomeDoArquivo(patrimonio.imagemPrincipal),
    resumo: patrimonio.resumo,
  };
}

export default function AdminPatrimonios() {
  const { mostrarErro } = useErroModal();

  // const [patrimonios, setPatrimonios] = useState([]);
  // const [carregando, setCarregando] = useState(true);
  // const [erro, setErro] = useState(null);
  const [patrimonios, setPatrimonios] = useState(PATRIMONIOS_MOCK);
  const [carregando] = useState(false);
  const [erro] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [erroFormulario, setErroFormulario] = useState(null);
  // const [salvando, setSalvando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [etapaSalvando, setEtapaSalvando] = useState("");

  // Coordenadas do patrimônio que está sendo editado e a "chave" do endereço
  // com que elas foram calculadas: se o endereço não mudou, reaproveitamos
  // as coordenadas e NÃO gastamos uma nova consulta de geocodificação.
  const [coordenadas, setCoordenadas] = useState(null);
  const [chaveOriginal, setChaveOriginal] = useState("");

  const [erroImagem, setErroImagem] = useState(null);
  const [erroArquivo, setErroArquivo] = useState(null);
  const [arquivoResumo, setArquivoResumo] = useState(null);
  const [gerando, setGerando] = useState(false);

  const inputImagemRef = useRef(null);
  const inputArquivoRef = useRef(null);
  const urlPreviaRef = useRef(null);

  // Libera a URL temporária da prévia se a tela for fechada com ela aberta.
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (urlPreviaRef.current) URL.revokeObjectURL(urlPreviaRef.current);
    };
  }, []);

  const contagemPorCategoria = useMemo(
    () =>
      patrimonios.reduce((acc, p) => {
        acc[p.categoria] = (acc[p.categoria] || 0) + 1;
        return acc;
      }, {}),
    [patrimonios],
  );

  /* ----- ORIGINAL (API) — descomentar quando o backend estiver integrado -----
  async function carregarPatrimonios() {
    setCarregando(true);
    setErro(null);

    try {
      const lista = await listarPatrimonios();
      setPatrimonios(lista);
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
  }, []);
  ----- fim do ORIGINAL (API) ----- */

  function liberarPrevia() {
    if (urlPreviaRef.current) {
      URL.revokeObjectURL(urlPreviaRef.current);
      urlPreviaRef.current = null;
    }
  }

  function reiniciarEstadosAuxiliares() {
    setErroFormulario(null);
    setErroImagem(null);
    setErroArquivo(null);
    setArquivoResumo(null);
    setGerando(false);
  }

  function abrirNovo() {
    liberarPrevia();
    reiniciarEstadosAuxiliares();
    setFormulario(FORMULARIO_VAZIO);
    setCoordenadas(null);
    setChaveOriginal("");
    setEditandoId("novo");
  }

  function abrirEdicao(patrimonio) {
    liberarPrevia();
    reiniciarEstadosAuxiliares();
    setFormulario(paraFormulario(patrimonio));
    setCoordenadas(patrimonio.localizacao ?? null);
    setChaveOriginal(chaveEndereco(patrimonio));
    setEditandoId(patrimonio.id);
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
    liberarPrevia(); // descarta a prévia de uma imagem que não foi salva
    fecharFormulario();
  }

  function atualizar(campo, valor) {
    setFormulario((f) => ({ ...f, [campo]: valor }));
  }

  // ===== Imagem (clipe) =====

  function escolherImagem(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois

    if (!arquivo) return;

    // Conferência só de conforto. O backend precisa validar o conteúdo de
    // verdade (tipo real do arquivo, tamanho, recompressão) antes de guardar.
    if (!TIPOS_IMAGEM.includes(arquivo.type)) {
      setErroImagem("Use uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (arquivo.size > TAMANHO_MAX_IMAGEM) {
      setErroImagem("A imagem pode ter no máximo 5 MB.");
      return;
    }

    liberarPrevia();
    const url = URL.createObjectURL(arquivo);
    urlPreviaRef.current = url;

    setErroImagem(null);
    setFormulario((f) => ({
      ...f,
      imagemPrincipal: url,
      imagemNome: arquivo.name,
    }));
  }

  function removerImagem() {
    liberarPrevia();
    setErroImagem(null);
    setFormulario((f) => ({ ...f, imagemPrincipal: "", imagemNome: "" }));
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

  /* ----- ORIGINAL (API) — descomentar quando o backend estiver integrado -----
  // Mesmo fluxo do salvar abaixo, trocando o final por chamadas à API.
  // Atenção: o formato de "dados" e o envio da imagem (multipart) precisam
  // ser confirmados com a equipe do backend (veja ADMIN.md).
  async function salvar(e) {
    e.preventDefault();
    ...validações e geocodificação iguais às do mock...

    if (editandoId === "novo") {
      await adminApi.criarPatrimonio(dados);
    } else {
      await adminApi.atualizarPatrimonio(editandoId, dados);
    }

    fecharFormulario();
    await carregarPatrimonios();
  }

  async function excluir(patrimonio) {
    ...confirmação igual à do mock...
    await adminApi.excluirPatrimonio(patrimonio.id);
    await carregarPatrimonios();
  }
  ----- fim do ORIGINAL (API) ----- */

  /* ---------- MOCK TEMPORÁRIO: altera só a lista em memória (some no F5) ---------- */
  async function salvar(e) {
    e.preventDefault();
    setErroFormulario(null);

    const cepNumeros = formulario.cep.replace(/\D/g, "");

    if (cepNumeros.length !== 8) {
      setErroFormulario("Informe um CEP válido, com 8 dígitos.");
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
      // Só consulta o mapa se for um cadastro novo, se ainda não houver
      // coordenadas ou se o endereço mudou. Caso contrário, reaproveita.
      let localizacao = coordenadas;
      const enderecoMudou = chaveEndereco(formulario) !== chaveOriginal;

      if (editandoId === "novo" || !localizacao || enderecoMudou) {
        setEtapaSalvando("Localizando o endereço no mapa…");
        localizacao = await geocodificarEndereco(formulario);
      }

      const dados = {
        nome: formulario.nome.trim(),
        categoria: formulario.categoria,
        bairro: formulario.bairro.trim(),
        endereco: formulario.endereco.trim(),
        numero: formulario.numero.trim(),
        complemento: formulario.complemento.trim(),
        cep: formulario.cep,
        resumo: formulario.resumo.trim(),
        imagemPrincipal: formulario.imagemPrincipal,
        localizacao,
      };

      if (editandoId === "novo") {
        setPatrimonios((lista) => [
          ...lista,
          { id: String(Date.now()), ...dados },
        ]);
      } else {
        setPatrimonios((lista) =>
          lista.map((p) => (p.id === editandoId ? { ...p, ...dados } : p)),
        );
      }

      // A imagem salva continua usando a URL temporária (no mock). Não
      // revogamos aqui, senão a imagem do item sumiria da lista.
      urlPreviaRef.current = null;
      fecharFormulario();
    } catch (err) {
      mostrarErro(err, {
        origem: "AdminPatrimonios › salvar",
        mensagem: "Não foi possível salvar o patrimônio.",
      });
    } finally {
      setSalvando(false);
      setEtapaSalvando("");
    }
  }

  function excluir(patrimonio) {
    const confirmou = window.confirm(
      `Excluir "${patrimonio.nome}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmou) return;

    try {
      setPatrimonios((lista) => lista.filter((p) => p.id !== patrimonio.id));
    } catch (err) {
      mostrarErro(err, { origem: "AdminPatrimonios › excluir" });
    }
  }

  const modoArquivo = formulario.modoResumo === "arquivo";

  return (
    <div>
      <div className="admin-page-head admin-page-head-row">
        <div>
          <h1>Patrimônios</h1>
          <p>O acervo que aparece no site público vem direto daqui.</p>
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
                value={formulario.categoria}
                onChange={(e) => atualizar("categoria", e.target.value)}
              >
                {CATEGORIAS_ORDEM.map((slug) => (
                  <option key={slug} value={slug}>
                    {CATEGORIA_META[slug].label}
                  </option>
                ))}
              </select>
            </label>

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
                  " (Modo demonstração: as coordenadas são simuladas.)"}
              </span>
            </p>

            {/* ----- Imagem principal (clipe) ----- */}
            <div className="admin-form-col-2 admin-upload">
              <span className="admin-upload-rotulo">Imagem principal</span>

              <div className="admin-upload-linha">
                <input
                  ref={inputImagemRef}
                  type="file"
                  accept={TIPOS_IMAGEM.join(",")}
                  hidden
                  onChange={escolherImagem}
                />

                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => inputImagemRef.current?.click()}
                >
                  <PaperClipIcon width={16} height={16} />
                  {formulario.imagemPrincipal
                    ? "Trocar imagem"
                    : "Anexar imagem"}
                </button>

                <span className="admin-upload-nome">
                  {formulario.imagemNome || "JPG, PNG ou WebP, até 5 MB"}
                </span>

                {formulario.imagemPrincipal && (
                  <button
                    type="button"
                    className="admin-upload-remover"
                    aria-label="Remover imagem"
                    onClick={removerImagem}
                  >
                    <XMarkIcon width={16} height={16} />
                  </button>
                )}
              </div>

              {formulario.imagemPrincipal && (
                <img
                  className="admin-upload-previa"
                  src={formulario.imagemPrincipal}
                  alt="Prévia da imagem principal"
                />
              )}

              {erroImagem && <p className="admin-form-erro">{erroImagem}</p>}
            </div>

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
        {CATEGORIAS_ORDEM.map((slug) => (
          <span key={slug} className="admin-cat" data-cat={slug}>
            {CATEGORIA_META[slug].label} · {contagemPorCategoria[slug] || 0}
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
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {patrimonios.map((p) => (
              <tr key={p.id} data-cat={p.categoria}>
                <td>{p.nome}</td>
                <td>
                  <span className="admin-cat" data-cat={p.categoria}>
                    {CATEGORIA_META[p.categoria]?.label ?? p.categoria}
                  </span>
                </td>
                <td>{p.bairro}</td>
                <td className="admin-table-acoes">
                  <button
                    type="button"
                    aria-label={`Editar ${p.nome}`}
                    onClick={() => abrirEdicao(p)}
                  >
                    <PencilIcon width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir ${p.nome}`}
                    onClick={() => excluir(p)}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
