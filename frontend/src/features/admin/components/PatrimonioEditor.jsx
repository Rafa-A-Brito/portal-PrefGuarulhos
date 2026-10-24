import { useCallback, useEffect, useRef, useState } from "react";
import {
  PaperClipIcon,
  XMarkIcon,
  LinkIcon,
  DocumentTextIcon,
  MapPinIcon,
  ArrowPathIcon,
  PhotoIcon,
  TrashIcon,
  CheckCircleIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuth";
import { useGoogleMaps } from "../../../hooks/useGoogleMaps";
import { useErroModal } from "../../../hooks/useErroModal";
import { useCepEndereco } from "../../../hooks/useCepEndereco";
import {
  geocodificarEndereco,
  chaveEndereco,
  GEOCODING_EM_MODO_DEMO,
} from "../../../services/maps";
import { listarCategorias } from "../../../services/patrimoniosApi";
import * as adminApi from "../../../services/adminApi";
import * as referenciasApi from "../../../services/referenciasApi";
import AdminLigacoes from "./AdminLigacoes";
import OrganizacaoEditorial from "./OrganizacaoEditorial";
import "./PatrimonioEditor.css";

/**
 * Editor completo de patrimônio (campos, imagens, referências, organização
 * editorial e ligações). Foi extraído de AdminPatrimonios.jsx SEM mudar regras:
 * o dashboard e o modal da página pública (D3E) usam este mesmo componente.
 *
 * Props:
 *  - idInicial: "novo" ou o UUID do patrimônio. Para trocar de patrimônio,
 *    quem usa muda a `key` do componente (ele carrega uma vez ao montar).
 *  - detalheInicial: detalhe já validado ao alternar de outro formulário;
 *    evita uma segunda consulta e preserva o editor anterior em caso de erro.
 *  - categorias: opcional; se ausente o editor busca GET /categorias.
 *  - semTitulo: esconde o <h2> (o modal já tem o próprio cabeçalho).
 *  - rolarAoAbrir: rola até o formulário ao abrir (dashboard). No modal, não.
 *  - onSaved({ uuid, criado, dados }): gravação principal concluída (PATCH/POST).
 *  - onIdChange(uuid): após criar, o editor passa a editar o novo UUID.
 *  - onCancel({ forcar }): pedido de fechar. `forcar: true` = não há o que
 *    proteger (gravou, ou a carga falhou); sem `forcar` é o botão Cancelar.
 *  - onBusyChange(bool) / onDirtyChange(bool): ocupado (carga, gravação,
 *    upload...) e alterações locais ainda não gravadas.
 *  - onRemoteChange(): algo foi gravado NA HORA fora do botão Salvar (imagem,
 *    referência, ligação). Não é desfeito ao cancelar.
 */

// "descricao" no backend é texto livre (sem limite); este é só o limite do
// formulário. O campo "descricaoResumida" do backend aceita no máximo 500.
const LIMITE_DESCRICAO = 2000; // 2.000 caracteres (aprox. 300 palavras)
const LIMITE_RESUMO = 500;
const MAX_CATEGORIAS_ADICIONAIS = 6;

const SITUACOES = [
  { valor: "NAO_INFORMADO", rotulo: "Não informada" },
  { valor: "PRESERVADO", rotulo: "Preservado" },
  { valor: "EM_RESTAURACAO", rotulo: "Em restauração" },
  { valor: "NECESSITA_RESTAURACAO", rotulo: "Necessita restauração" },
  { valor: "EM_RUINAS", rotulo: "Em ruínas" },
  { valor: "DEMOLIDO", rotulo: "Demolido" },
];

const FORMULARIO_VAZIO = {
  regiaoId: "",
  regiaoOriginalId: "",
  regiaoAtual: null,
  numeroExibicao: "",
  ordemExibicao: "",
  nome: "",
  categoriaId: "",
  categoriasAdicionais: [],
  situacao: "NAO_INFORMADO",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "Guarulhos",
  uf: "SP",
  descricao: "",
  descricaoResumida: "",
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

/**
 * Põe a imagem recém-enviada na lista local. A ordem espelha a do backend
 * (capa primeiro, depois "ordem"), e uma nova capa tira a marca das demais,
 * como o imageService faz no banco. Evita um GET só para atualizar a tela.
 */
function mesclarImagem(lista, nova) {
  const base = nova.principal
    ? lista.map((img) => ({ ...img, principal: false }))
    : lista;

  return [...base, nova].sort(
    (a, b) =>
      Number(b.principal) - Number(a.principal) ||
      (a.ordem ?? 0) - (b.ordem ?? 0),
  );
}

// Detalhe do backend (já normalizado por patrimoniosApi) -> formulário plano.
// As coordenadas NÃO vão para o formulário: a pessoa nunca as vê nem as digita.
function paraFormulario(patrimonio) {
  return {
    ...FORMULARIO_VAZIO,
    regiaoId: patrimonio.regiaoId ?? "",
    regiaoOriginalId: patrimonio.regiaoId ?? "",
    regiaoAtual: patrimonio.regiao ?? null,
    numeroExibicao: patrimonio.numeroExibicao ?? "",
    ordemExibicao: patrimonio.ordemExibicao ?? "",
    nome: patrimonio.nome,
    categoriaId: patrimonio.categoriaId ?? "",
    categoriasAdicionais: patrimonio.categoriasAdicionaisIds ?? [],
    situacao: patrimonio.situacao ?? "NAO_INFORMADO",
    cep: formatarCep(patrimonio.cep || ""),
    endereco: patrimonio.endereco || "",
    numero: patrimonio.numero || "",
    complemento: patrimonio.complemento || "",
    bairro: patrimonio.bairro || "",
    cidade: patrimonio.cidade || "Guarulhos",
    uf: patrimonio.uf || "SP",
    descricao: patrimonio.descricao ?? "",
    descricaoResumida: patrimonio.resumo ?? "",
    historia: patrimonio.historia || "",
    importanciaCultural: patrimonio.importanciaCultural || "",
  };
}
export default function PatrimonioEditor({
  idInicial,
  detalheInicial = null,
  categorias: categoriasProp,
  semTitulo = false,
  rolarAoAbrir = true,
  onSaved,
  onIdChange,
  onCancel,
  onBusyChange,
  onDirtyChange,
  onRemoteChange,
}) {
  const { usuario } = useAuth();
  const { mostrarErro } = useErroModal();
  const eAdmin = usuario?.perfil === "ADMIN";
  const podeEditar = (p) =>
    eAdmin || (usuario?.perfil === "EDITOR" && p.status === "RASCUNHO");

  // Mesmo loader do mapa público (um script só). Aqui ele serve ao geocoding:
  // o geocodificarEndereco espera o Geocoder existir, e este "erro" só avisa
  // antes de salvar quando o script falhou de vez (chave, rede, domínio).
  const { erro: erroMaps } = useGoogleMaps();

  // "novo" = criando; senão, UUID do patrimônio em edição.
  const [editandoId, setEditandoId] = useState(idInicial);
  const [categoriasCarregadas, setCategoriasCarregadas] = useState([]);
  const categorias = categoriasProp ?? categoriasCarregadas;
  const [statusEdicao, setStatusEdicao] = useState(null);
  const [operandoLigacoes, setOperandoLigacoes] = useState(false);
  // Carga do detalhe (e das categorias, quando não vieram por prop).
  const [carregandoEdicao, setCarregandoEdicao] = useState(true);
  const [erroCarga, setErroCarga] = useState(null); // { mensagem, podeRepetir }
  const formularioRef = useRef(null);
  const pedidoEdicaoRef = useRef(0);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  // Foto do formulário logo após carregar/salvar: base do "há alterações?".
  const [formularioBase, setFormularioBase] = useState(null);
  const {
    feedbackCep,
    alterarCep,
    marcarCampoManual,
    reiniciarCep,
    cancelarConsultaCep,
  } = useCepEndereco(setFormulario);
  const [erroFormulario, setErroFormulario] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvandoRegiao, setSalvandoRegiao] = useState(false);
  const [regiaoSuja, setRegiaoSuja] = useState(false);
  const [etapaSalvando, setEtapaSalvando] = useState("");

  // Coordenadas do patrimônio em edição e a "chave" do endereço com que
  // foram calculadas: endereço igual => reaproveita e não gasta geocodificação.
  const [coordenadas, setCoordenadas] = useState(null);
  const [chaveOriginal, setChaveOriginal] = useState("");

  // Imagens do patrimônio em edição (só existem depois de ele ser salvo).
  const [imagens, setImagens] = useState([]);
  const [imagemSelecionada, setImagemSelecionada] = useState(null);
  const [textoAltImagem, setTextoAltImagem] = useState("");
  const [creditoImagem, setCreditoImagem] = useState("");
  const [imagemCapa, setImagemCapa] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [removendoImagemId, setRemovendoImagemId] = useState(null);
  const [erroImagem, setErroImagem] = useState(null);
  const [avisoFormulario, setAvisoFormulario] = useState(null);

  const inputImagemRef = useRef(null);
  const operandoImagem = enviandoImagem || removendoImagemId !== null;

  // Referência do texto (arquivo ou link). Como as imagens, só existe depois
  // de o patrimônio ser salvo. O arquivo serve como fonte do texto.
  const [referencias, setReferencias] = useState([]);
  const [refModo, setRefModo] = useState("arquivo"); // "arquivo" | "link"
  const [refArquivo, setRefArquivo] = useState(null);
  const [refLink, setRefLink] = useState("");
  const [refDescricao, setRefDescricao] = useState("");
  const [enviandoRef, setEnviandoRef] = useState(false);
  const [removendoRefId, setRemovendoRefId] = useState(null);
  const [erroRef, setErroRef] = useState(null);
  const inputReferenciaRef = useRef(null);
  const operandoReferencia = enviandoRef || removendoRefId !== null;

  // Referência estável para a callback de quem usa o editor.
  const remotoRef = useRef(onRemoteChange);
  useEffect(() => {
    remotoRef.current = onRemoteChange;
  });
  const ligacoesOcupadasRef = useRef(false);
  // Ligações gravam na hora; ao terminar uma operação, avisa quem usa o editor.
  const aoMudarOcupadoLigacoes = useCallback((ocupadoAgora) => {
    if (ligacoesOcupadasRef.current && !ocupadoAgora) remotoRef.current?.();
    ligacoesOcupadasRef.current = ocupadoAgora;
    setOperandoLigacoes(ocupadoAgora);
  }, []);

  const ocupado =
    operandoLigacoes ||
    salvando ||
    operandoImagem ||
    operandoReferencia ||
    carregandoEdicao ||
    salvandoRegiao;

  // Alterações locais ainda não gravadas: campos do formulário + arquivo de
  // imagem/referência escolhido e ainda não enviado. (Imagens, referências,
  // regiões e ligações já enviadas são gravadas na hora e não entram aqui.)
  const sujo =
    formularioBase !== null &&
    (regiaoSuja ||
      JSON.stringify(formulario) !== formularioBase ||
      imagemSelecionada !== null ||
      refArquivo !== null ||
      refLink.trim() !== "" ||
      refDescricao.trim() !== "");

  useEffect(() => {
    onBusyChange?.(ocupado);
  }, [ocupado, onBusyChange]);

  useEffect(() => {
    onDirtyChange?.(sujo);
  }, [sujo, onDirtyChange]);

  // Ao desmontar, avisa que nada mais está ocupado/sujo e invalida pedidos.
  useEffect(
    () => () => {
      pedidoEdicaoRef.current++;
      onBusyChange?.(false);
      onDirtyChange?.(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!carregandoEdicao && !erroCarga) {
      if (rolarAoAbrir) {
        formularioRef.current?.scrollIntoView?.({
          behavior: "smooth",
          block: "start",
        });
      }
      formularioRef.current
        ?.querySelector("input")
        ?.focus({ preventScroll: true });
    }
  }, [carregandoEdicao, erroCarga, rolarAoAbrir]);

  function limparSelecaoImagem() {
    setImagemSelecionada(null);
    setTextoAltImagem("");
    setCreditoImagem("");
    setImagemCapa(false);
  }

  function reiniciarEstadosAuxiliares() {
    reiniciarCep();
    setErroFormulario(null);
    setImagens([]);
    setReferencias([]);
    limparReferencia();
    limparSelecaoImagem();
    setErroImagem(null);
    setAvisoFormulario(null);
  }

  function aplicarFormulario(preenchido) {
    setFormulario(preenchido);
    setFormularioBase(JSON.stringify(preenchido));
  }

  // Abre em modo "novo" ou carrega o detalhe (a listagem não traz
  // descricao/historia, então a edição busca GET /admin/patrimonios/:uuid).
  // Devolve true quando o formulário ficou pronto. Respostas de pedidos
  // antigos (troca de item, fechamento, desmontagem) são descartadas.
  const carregar = useCallback(
    async (alvo, aviso = null, detalhePrecarregado = null) => {
      cancelarConsultaCep();
      const pedido = ++pedidoEdicaoRef.current;
      setCarregandoEdicao(true);
      setErroCarga(null);

      try {
        const [detalhe, cats] = await Promise.all([
          alvo === "novo" ? null : (detalhePrecarregado ?? adminApi.buscarPatrimonioAdmin(alvo)),
          categoriasProp ?? listarCategorias(),
        ]);
        if (pedido !== pedidoEdicaoRef.current) return false;

        if (!categoriasProp) setCategoriasCarregadas(cats);

        reiniciarEstadosAuxiliares();

        if (!detalhe) {
          aplicarFormulario({
            ...FORMULARIO_VAZIO,
            categoriaId: cats[0]?.id ?? "",
          });
          setCoordenadas(null);
          setChaveOriginal("");
          setStatusEdicao(null);
          setEditandoId("novo");
          return true;
        }

        if (!podeEditar(detalhe)) {
          setErroCarga({
            mensagem:
              "Este patrimônio não está mais em rascunho. Somente ADMIN pode editá-lo.",
            podeRepetir: false,
          });
          return false;
        }

        const preenchido = paraFormulario(detalhe);
        reiniciarCep(preenchido);
        aplicarFormulario(preenchido);
        setImagens(detalhe.imagens ?? []);
        setReferencias(detalhe.referencias ?? []);
        setStatusEdicao(detalhe.status);
        setCoordenadas(detalhe.localizacao ?? null);
        setChaveOriginal(chaveEndereco(detalhe));
        setEditandoId(detalhe.uuid);
        if (aviso) setAvisoFormulario(aviso);
        return true;
      } catch (err) {
        if (pedido !== pedidoEdicaoRef.current) return false;
        setErroCarga({
          mensagem: adminApi.extrairMensagemDeErro(err),
          // 401/403/404 não melhoram com nova tentativa.
          podeRepetir: ![401, 403, 404].includes(err.response?.status),
        });
        // 401/403/404 já têm mensagem própria acima; o resto abre o modal global.
        if (![401, 403, 404].includes(err.response?.status)) {
          mostrarErro(err, { origem: "PatrimonioEditor › carregar" });
        }
        return false;
      } finally {
        if (pedido === pedidoEdicaoRef.current) setCarregandoEdicao(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoriasProp],
  );

  useEffect(() => {
    // Carga inicial: roda uma vez por montagem (quem usa troca a `key`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar(idInicial, null, detalheInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelarFormulario() {
    onCancel?.({ forcar: false });
  }

  function atualizar(campo, valor) {
    marcarCampoManual(campo);
    if (campo === "cep") alterarCep(valor);
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

  // ===== Salvar =====

  async function salvar(e) {
    e.preventDefault();
    if (ocupado || !editandoId) return;
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

    if (!formulario.descricao.trim()) {
      setErroFormulario("Escreva a descrição do patrimônio.");
      return;
    }

    if (!formulario.descricaoResumida.trim()) {
      setErroFormulario("Escreva o resumo do patrimônio.");
      return;
    }

    if (formulario.descricaoResumida.trim().length > LIMITE_RESUMO) {
      setErroFormulario("O resumo deve ter no máximo 500 caracteres.");
      return;
    }

    const enderecoMudou = chaveEndereco(formulario) !== chaveOriginal;
    const precisaGeocodificar =
      editandoId === "novo" || !coordenadas || enderecoMudou;
    if (!GEOCODING_EM_MODO_DEMO && precisaGeocodificar && erroMaps) {
      setErroFormulario(
        "Não foi possível carregar o Google Maps para localizar o endereço. Verifique a chave da API e a conexão e recarregue a página.",
      );
      return;
    }

    // Congela o endereço usado pelo save; uma consulta pendente nunca pode
    // alterar o formulário durante geocoding/PATCH, mesmo se o save falhar.
    cancelarConsultaCep();
    setSalvando(true);

    try {
      // Coordenadas:
      //  - geocodificação REAL ligada: recalcula quando é cadastro novo, quando
      //    o patrimônio ainda não tem coordenadas ou quando o endereço mudou;
      //  - modo demonstração: NUNCA inventa coordenadas. Se o endereço mudou
      //    numa edição, as coordenadas antigas deixam de valer (apontariam
      //    para o lugar errado) e são limpas (null) em vez de mantidas em
      //    silêncio. Endereço igual: nada é enviado e o banco mantém o que tem.
      let latitude;
      let longitude;

      if (!GEOCODING_EM_MODO_DEMO) {
        let ponto = coordenadas;

        if (precisaGeocodificar) {
          setEtapaSalvando("Localizando o endereço no mapa…");
          ponto = await geocodificarEndereco(formulario);
        }

        latitude = ponto.lat;
        longitude = ponto.lng;
      } else if (editandoId !== "novo" && enderecoMudou && coordenadas) {
        latitude = null;
        longitude = null;
      }

      setEtapaSalvando("Salvando…");

      // Campos opcionais vazios NÃO são enviados: o backend rejeita string
      // vazia (min 1) e campos desconhecidos (strictObject).
      const opcional = (valor) => {
        const texto = valor.trim();
        return texto ? texto : undefined;
      };

      const dados = {
        // Omitir vínculo inalterado permite editar fichas cuja região foi inativada.
        ...((editandoId === "novo" ||
          formulario.regiaoId !== formulario.regiaoOriginalId) && {
          regiaoId: formulario.regiaoId || null,
        }),
        numeroExibicao:
          formulario.numeroExibicao === ""
            ? null
            : Number(formulario.numeroExibicao),
        ordemExibicao:
          formulario.ordemExibicao === ""
            ? null
            : Number(formulario.ordemExibicao),
        nome: formulario.nome.trim(),
        descricao: formulario.descricao.trim(),
        descricaoResumida: formulario.descricaoResumida.trim(),
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
          cidade: formulario.cidade.trim(),
          uf: formulario.uf.trim(),
          cep: formulario.cep,
          ...(latitude !== undefined && { latitude, longitude }),
        },
      };

      if (editandoId === "novo") {
        const criado = await adminApi.criarPatrimonio(dados);
        onSaved?.({ uuid: criado.id, criado: true, dados: criado });
        onIdChange?.(criado.id);

        // As imagens precisam do UUID do patrimônio, que só existe depois de
        // criado. Em vez de fechar, recarrega o formulário já em modo edição
        // para a pessoa enviar as imagens em seguida.
        const abriu = await carregar(
          criado.id,
          "Patrimônio criado como rascunho. Agora você já pode enviar as imagens.",
        );

        // O cadastro já foi criado; fechar evita que um novo clique em Salvar o duplique.
        if (!abriu) onCancel?.({ forcar: true });

        return;
      }

      const atualizado = await adminApi.atualizarPatrimonio(editandoId, dados);

      // Gravou: o que está no formulário passa a ser o "salvo". Quem usa o
      // editor decide o que fazer em seguida (fechar, recarregar a lista...).
      setFormularioBase(JSON.stringify(formulario));
      await onSaved?.({ uuid: editandoId, criado: false, dados: atualizado });
    } catch (err) {
      setErroFormulario(adminApi.extrairMensagemDeErro(err));
      if (![400, 401, 403, 404, 409].includes(err.response?.status)) {
        mostrarErro(err, { origem: "AdminPatrimonios › salvar" });
      }
    } finally {
      setSalvando(false);
      setEtapaSalvando("");
    }
  }


  function escolherImagem(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";

    if (!arquivo) return;

    const problema = adminApi.validarArquivoImagem(arquivo);

    if (problema) {
      setErroImagem(problema);
      return;
    }

    setErroImagem(null);
    setImagemSelecionada(arquivo);
    // A primeira imagem do patrimônio já nasce como capa.
    setImagemCapa(imagens.length === 0);
  }

  // 400/403/404/413 têm mensagem própria aqui; o resto (rede, 5xx) vai pro modal.
  function tratarErroImagem(err, acao) {
    const status = err.response?.status;
    const mensagens = {
      403: "Você não tem permissão para esta ação.",
      404: "Patrimônio ou imagem não encontrado. Recarregue a página.",
      413: "A imagem é grande demais para o servidor (máximo de 10 MB).",
    };

    if (status === 400) {
      setErroImagem(adminApi.extrairMensagemDeErro(err));
    } else if (mensagens[status]) {
      setErroImagem(mensagens[status]);
    } else {
      mostrarErro(err, {
        origem: `AdminPatrimonios › ${acao} imagem`,
        mensagem:
          acao === "enviar"
            ? "Não foi possível enviar a imagem."
            : "Não foi possível remover a imagem.",
      });
    }
  }

  async function enviarImagem() {
    if (!imagemSelecionada || ocupado) return;
    if (!editandoId || editandoId === "novo") return;

    setEnviandoImagem(true);
    setErroImagem(null);

    try {
      const proximaOrdem = imagens.length
        ? Math.max(...imagens.map((img) => img.ordem ?? 0)) + 1
        : 0;

      const nova = await adminApi.enviarImagemPatrimonio(
        editandoId,
        imagemSelecionada,
        {
          // Sem texto alternativo, usa o nome do patrimônio (melhor que o
          // nome do arquivo, que é o que o backend usaria).
          textoAlternativo: textoAltImagem.trim() || formulario.nome,
          credito: creditoImagem,
          ordem: proximaOrdem,
          principal: imagemCapa,
        },
      );

      setImagens((atual) => mesclarImagem(atual, nova));
      limparSelecaoImagem();
      remotoRef.current?.();
    } catch (err) {
      tratarErroImagem(err, "enviar");
    } finally {
      setEnviandoImagem(false);
    }
  }

  async function removerImagem(imagem) {
    if (!eAdmin || ocupado) return;

    const confirmou = window.confirm(
      "Remover esta imagem? O arquivo também será apagado do servidor.",
    );
    if (!confirmou) return;

    setRemovendoImagemId(imagem.id);
    setErroImagem(null);

    try {
      await adminApi.removerImagemPatrimonio(imagem.id);
      setImagens((atual) => atual.filter((img) => img.id !== imagem.id));
      remotoRef.current?.();
    } catch (err) {
      // 404: a imagem já não existe no servidor; some da tela também.
      if (err.response?.status === 404) {
        setImagens((atual) => atual.filter((img) => img.id !== imagem.id));
      }
      tratarErroImagem(err, "remover");
    } finally {
      setRemovendoImagemId(null);
    }
  }

  // ===== Referência do texto (arquivo ou link) =====

  function limparReferencia() {
    setRefArquivo(null);
    setRefLink("");
    setRefDescricao("");
    setErroRef(null);
  }

  function trocarModoReferencia(modo) {
    setRefModo(modo);
    setRefArquivo(null);
    setRefLink("");
    setErroRef(null);
  }

  function escolherArquivoReferencia(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    const problema = referenciasApi.validarArquivoReferencia(arquivo);
    if (problema) {
      setErroRef(problema);
      return;
    }

    setErroRef(null);
    setRefArquivo(arquivo);
  }

  const referenciaPronta =
    refModo === "arquivo" ? Boolean(refArquivo) : refLink.trim() !== "";

  // 400/403/404/413 têm mensagem própria; o resto (rede, 5xx) vai pro modal.
  function tratarErroReferencia(err, acao) {
    const status = err.response?.status;
    const mensagens = {
      403: "Você não tem permissão para esta ação.",
      404: "Rota de referências não encontrada no servidor (ou o patrimônio não existe). Recarregue a página e confira o backend.",
      413: `O arquivo é grande demais para o servidor (máximo de ${referenciasApi.TAMANHO_MAX_REFERENCIA_MB} MB).`,
    };

    if (status === 400) {
      setErroRef(adminApi.extrairMensagemDeErro(err));
    } else if (mensagens[status]) {
      setErroRef(mensagens[status]);
    } else {
      mostrarErro(err, {
        origem: `AdminPatrimonios › ${acao} referência`,
        mensagem:
          acao === "enviar"
            ? "Não foi possível anexar a referência."
            : "Não foi possível remover a referência.",
      });
    }
  }

  async function enviarReferencia() {
    if (!referenciaPronta || ocupado) return;
    if (!editandoId || editandoId === "novo") return;

    if (refModo === "link") {
      const problema = referenciasApi.validarLinkReferencia(refLink);
      if (problema) {
        setErroRef(problema);
        return;
      }
    }

    setEnviandoRef(true);
    setErroRef(null);

    try {
      const nova = await referenciasApi.enviarReferenciaPatrimonio(editandoId, {
        arquivo: refModo === "arquivo" ? refArquivo : undefined,
        url: refModo === "link" ? refLink.trim() : undefined,
        descricao: refDescricao.trim() || undefined,
      });

      setReferencias((atual) => [...atual, nova]);
      limparReferencia();
      remotoRef.current?.();
    } catch (err) {
      tratarErroReferencia(err, "enviar");
    } finally {
      setEnviandoRef(false);
    }
  }

  async function removerReferencia(referencia) {
    if (!eAdmin || ocupado) return;

    const confirmou = window.confirm("Remover esta referência?");
    if (!confirmou) return;

    setRemovendoRefId(referencia.id);
    setErroRef(null);

    try {
      await referenciasApi.removerReferenciaPatrimonio(
        editandoId,
        referencia.id,
      );
      setReferencias((atual) => atual.filter((r) => r.id !== referencia.id));
      remotoRef.current?.();
    } catch (err) {
      // 404: já não existe no servidor; some da tela também.
      if (err.response?.status === 404) {
        setReferencias((atual) => atual.filter((r) => r.id !== referencia.id));
      }
      tratarErroReferencia(err, "remover");
    } finally {
      setRemovendoRefId(null);
    }
  }

  if (carregandoEdicao) {
    return (
      <div className="patrimonio-editor-carregando" aria-busy="true">
        <p role="status">Carregando patrimônio para edição…</p>
        <div className="patrimonio-editor-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="patrimonio-editor-erro" role="alert">
        <ExclamationTriangleIcon width={28} height={28} aria-hidden="true" />
        <p>{erroCarga.mensagem}</p>
        <div className="admin-form-acoes">
          {erroCarga.podeRepetir && (
            <button
              type="button"
              className="btn-solid"
              onClick={() => carregar(editandoId)}
            >
              Tentar novamente
            </button>
          )}
          <button
            type="button"
            className="btn-outline"
            onClick={() => onCancel?.({ forcar: true })}
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form
        ref={formularioRef}
        className="admin-form"
        onSubmit={salvar}
        aria-busy={ocupado}
        inert={ocupado}
      >
        {!semTitulo && (
          <h2>
            {editandoId === "novo" ? "Novo patrimônio" : "Editar patrimônio"}
          </h2>
        )}

        {avisoFormulario && (
          <p className="admin-ajuda" role="status">
            <CheckCircleIcon width={16} height={16} />
            <span>{avisoFormulario}</span>
          </p>
        )}

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

            <OrganizacaoEditorial
              key={editandoId}
              formulario={formulario}
              atualizar={atualizar}
              onBusyChange={setSalvandoRegiao}
              onDirtyChange={setRegiaoSuja}
              podeCriarRegiao={eAdmin}
            />
            <fieldset className="admin-form-col-2 admin-chips">
              <legend className="admin-chips-legenda">
                <span>Categorias adicionais</span>
                <span className="admin-chips-contador">
                  {formulario.categoriasAdicionais.length}/
                  {MAX_CATEGORIAS_ADICIONAIS}
                </span>
              </legend>
              <p className="admin-chips-ajuda">
                O bem também aparece nesses filtros.
              </p>
              <div className="admin-chips-lista">
                {categorias
                  .filter((c) => c.id !== formulario.categoriaId)
                  .map((c) => {
                    const marcada = formulario.categoriasAdicionais.includes(
                      c.id,
                    );
                    const bloqueada =
                      !marcada &&
                      formulario.categoriasAdicionais.length >=
                        MAX_CATEGORIAS_ADICIONAIS;

                    return (
                      <label
                        key={c.id}
                        className="admin-chip"
                        data-cat={c.slug}
                      >
                        <input
                          type="checkbox"
                          checked={marcada}
                          disabled={bloqueada}
                          onChange={() => alternarCategoriaAdicional(c.id)}
                        />
                        <span className="admin-chip-marca" aria-hidden="true">
                          {marcada && (
                            <CheckIcon width={12} height={12} strokeWidth={3} />
                          )}
                        </span>
                        {c.nome}
                      </label>
                    );
                  })}
              </div>
            </fieldset>

            <label>
              Bairro
              <input
                required
                value={formulario.bairro}
                onChange={(e) => atualizar("bairro", e.target.value)}
              />
            </label>

            <label htmlFor="patrimonio-cep">
              CEP
              <input
                required
                inputMode="numeric"
                autoComplete="postal-code"
                id="patrimonio-cep"
                aria-label="CEP"
                aria-describedby={
                  feedbackCep ? "patrimonio-cep-feedback" : undefined
                }
                maxLength={9}
                placeholder="00000-000"
                value={formulario.cep}
                onChange={(e) => atualizar("cep", formatarCep(e.target.value))}
              />
              {feedbackCep && (
                <span
                  id="patrimonio-cep-feedback"
                  className="admin-ajuda"
                  role="status"
                >
                  {feedbackCep}
                </span>
              )}
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

            <label>
              Cidade
              <input
                required
                autoComplete="address-level2"
                maxLength={100}
                value={formulario.cidade}
                onChange={(e) => atualizar("cidade", e.target.value)}
              />
            </label>

            <label>
              UF
              <input
                required
                autoComplete="address-level1"
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                value={formulario.uf}
                onChange={(e) => atualizar("uf", e.target.value.toUpperCase())}
              />
            </label>

            <p className="admin-ajuda admin-form-col-2">
              <MapPinIcon width={16} height={16} />
              <span>
                Cidade: {formulario.cidade} — {formulario.uf}. A posição no mapa
                é calculada automaticamente a partir do endereço quando você
                salva; não precisa informar latitude nem longitude.
                {GEOCODING_EM_MODO_DEMO &&
                  " (Geocodificação desligada: o patrimônio é salvo SEM coordenadas e não aparece no mapa até ela ser ativada. Se você mudar o endereço de um patrimônio já cadastrado, a posição antiga é removida.)"}
              </span>
            </p>

            {/* ----- Imagens: envio, listagem e remoção ----- */}
            {editandoId === "novo" ? (
              <p className="admin-ajuda admin-form-col-2">
                <PhotoIcon width={16} height={16} />
                <span>
                  As imagens são enviadas logo depois de salvar: o patrimônio é
                  criado como rascunho e o formulário continua aberto para o
                  envio.
                </span>
              </p>
            ) : (
              <div className="admin-form-col-2 admin-upload admin-imagens">
                <span className="admin-upload-rotulo">Imagens</span>

                {imagens.length === 0 ? (
                  <p className="admin-ajuda">Nenhuma imagem enviada ainda.</p>
                ) : (
                  <ul
                    className="admin-imagens-lista"
                    aria-label="Imagens do patrimônio"
                  >
                    {imagens.map((img) => (
                      <li key={img.id} className="admin-imagem-item">
                        <img
                          src={img.url}
                          alt={img.textoAlternativo || ""}
                          loading="lazy"
                        />
                        <div className="admin-imagem-rodape">
                          {img.principal ? (
                            <span className="admin-status admin-status--PUBLICADO">
                              Capa
                            </span>
                          ) : (
                            <span />
                          )}

                          {eAdmin && (
                            <button
                              type="button"
                              className="admin-upload-remover"
                              aria-label={`Remover imagem: ${img.textoAlternativo || "sem descrição"}`}
                              title="Remover imagem"
                              disabled={ocupado}
                              onClick={() => removerImagem(img)}
                            >
                              {removendoImagemId === img.id ? (
                                <ArrowPathIcon
                                  width={16}
                                  height={16}
                                  className="icon-spin"
                                />
                              ) : (
                                <TrashIcon width={16} height={16} />
                              )}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="admin-upload-linha admin-upload-bloco">
                  <input
                    ref={inputImagemRef}
                    type="file"
                    accept={adminApi.TIPOS_IMAGEM_ACEITOS.join(",")}
                    hidden
                    onChange={escolherImagem}
                  />

                  <button
                    type="button"
                    className="btn-outline"
                    disabled={ocupado}
                    onClick={() => inputImagemRef.current?.click()}
                  >
                    <PhotoIcon width={16} height={16} />
                    {imagemSelecionada ? "Trocar imagem" : "Escolher imagem"}
                  </button>

                  <span className="admin-upload-nome">
                    {imagemSelecionada?.name ||
                      "JPG, PNG, WEBP ou GIF, até 10 MB"}
                  </span>

                  {imagemSelecionada && !enviandoImagem && (
                    <button
                      type="button"
                      className="admin-upload-remover"
                      aria-label="Descartar imagem escolhida"
                      onClick={limparSelecaoImagem}
                    >
                      <XMarkIcon width={16} height={16} />
                    </button>
                  )}
                </div>

                {imagemSelecionada && (
                  <div className="admin-imagem-campos">
                    <label>
                      Texto alternativo (descreva a imagem)
                      <input
                        maxLength={300}
                        placeholder="Ex.: Fachada da estação vista da praça"
                        value={textoAltImagem}
                        onChange={(e) => setTextoAltImagem(e.target.value)}
                      />
                    </label>

                    <label>
                      Crédito (opcional)
                      <input
                        maxLength={200}
                        value={creditoImagem}
                        onChange={(e) => setCreditoImagem(e.target.value)}
                      />
                    </label>

                    <label className="admin-imagem-capa">
                      <input
                        type="checkbox"
                        checked={imagemCapa}
                        onChange={(e) => setImagemCapa(e.target.checked)}
                      />
                      Usar como imagem de capa
                    </label>

                    <div>
                      <button
                        type="button"
                        className="btn-solid"
                        disabled={ocupado}
                        onClick={enviarImagem}
                      >
                        {enviandoImagem ? (
                          <>
                            <ArrowPathIcon
                              width={16}
                              height={16}
                              className="icon-spin"
                            />
                            Enviando…
                          </>
                        ) : (
                          "Enviar imagem"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {erroImagem && (
                  <p className="admin-form-erro" role="alert">
                    {erroImagem}
                  </p>
                )}

                {!eAdmin && imagens.length > 0 && (
                  <p className="admin-aviso-texto">
                    Somente administradores podem remover imagens.
                  </p>
                )}
              </div>
            )}

            <div className="admin-form-col-2 admin-upload">
              <label
                htmlFor="patrimonio-descricao"
                className="admin-upload-rotulo"
              >
                Descrição
              </label>
              <textarea
                id="patrimonio-descricao"
                rows={6}
                maxLength={LIMITE_DESCRICAO}
                placeholder="Escreva a descrição completa do patrimônio."
                value={formulario.descricao}
                onChange={(e) => atualizar("descricao", e.target.value)}
              />
              <div className="admin-resumo-contador">
                {formulario.descricao.length}/{LIMITE_DESCRICAO}
              </div>
            </div>

            {/* ----- Resumo manual ----- */}
            <div className="admin-form-col-2 admin-upload">
              <label
                htmlFor="patrimonio-resumo"
                className="admin-upload-rotulo"
              >
                Resumo
              </label>
              <textarea
                id="patrimonio-resumo"
                rows={4}
                style={{ resize: "none" }}
                maxLength={LIMITE_RESUMO}
                placeholder="Escreva um resumo curto do patrimônio."
                value={formulario.descricaoResumida}
                onChange={(e) => atualizar("descricaoResumida", e.target.value)}
              />
              <div className="admin-resumo-contador">
                {formulario.descricaoResumida.length}/{LIMITE_RESUMO}
              </div>
              <p className="admin-aviso-texto">
                Se o texto vier de uma fonte (livro, site, documento), anexe a
                referência logo abaixo ou cite-a ao final do resumo.
              </p>
            </div>

            {/* ----- Referência do texto: arquivo (PDF, Word...) ou link (Drive, site) ----- */}
            {editandoId === "novo" ? (
              <p className="admin-ajuda admin-form-col-2">
                <PaperClipIcon width={16} height={16} />
                <span>
                  A referência do texto (arquivo ou link) é anexada logo depois
                  de salvar, igual às imagens.
                </span>
              </p>
            ) : (
              <div className="admin-form-col-2 admin-upload admin-refs">
                <span className="admin-upload-rotulo">
                  Referência do texto (opcional)
                </span>

                {referencias.length === 0 ? (
                  <p className="admin-ajuda">
                    Nenhuma referência anexada ainda.
                  </p>
                ) : (
                  <ul
                    className="admin-refs-lista"
                    aria-label="Referências do patrimônio"
                  >
                    {referencias.map((ref) => {
                      const Icone =
                        ref.tipo === "LINK" ? LinkIcon : DocumentTextIcon;
                      const rotulo =
                        ref.descricao || ref.nomeArquivo || ref.nome || ref.url;

                      return (
                        <li key={ref.id} className="admin-ref-item">
                          <Icone width={18} height={18} aria-hidden="true" />
                          {ref.url ? (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {rotulo}
                            </a>
                          ) : (
                            <span>{rotulo}</span>
                          )}

                          {eAdmin && (
                            <button
                              type="button"
                              className="admin-upload-remover"
                              aria-label={`Remover referência: ${rotulo}`}
                              title="Remover referência"
                              disabled={ocupado}
                              onClick={() => removerReferencia(ref)}
                            >
                              {removendoRefId === ref.id ? (
                                <ArrowPathIcon
                                  width={16}
                                  height={16}
                                  className="icon-spin"
                                />
                              ) : (
                                <TrashIcon width={16} height={16} />
                              )}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div
                  className="admin-segmentado"
                  role="tablist"
                  aria-label="Tipo de referência"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={refModo === "arquivo"}
                    onClick={() => trocarModoReferencia("arquivo")}
                  >
                    <PaperClipIcon width={15} height={15} />
                    Anexar arquivo
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={refModo === "link"}
                    onClick={() => trocarModoReferencia("link")}
                  >
                    <LinkIcon width={15} height={15} />
                    Link do Drive ou site
                  </button>
                </div>

                {refModo === "arquivo" ? (
                  <div className="admin-upload-linha admin-upload-bloco">
                    <input
                      ref={inputReferenciaRef}
                      type="file"
                      accept={referenciasApi.EXTENSOES_REFERENCIA.join(",")}
                      hidden
                      onChange={escolherArquivoReferencia}
                    />

                    <button
                      type="button"
                      className="btn-outline"
                      disabled={ocupado}
                      onClick={() => inputReferenciaRef.current?.click()}
                    >
                      <PaperClipIcon width={16} height={16} />
                      {refArquivo ? "Trocar arquivo" : "Escolher arquivo"}
                    </button>

                    <span className="admin-upload-nome">
                      {refArquivo?.name ||
                        `PDF, Word, TXT ou MD, até ${referenciasApi.TAMANHO_MAX_REFERENCIA_MB} MB`}
                    </span>

                    {refArquivo && !enviandoRef && (
                      <button
                        type="button"
                        className="admin-upload-remover"
                        aria-label="Descartar arquivo escolhido"
                        onClick={() => setRefArquivo(null)}
                      >
                        <XMarkIcon width={16} height={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <label className="admin-refs-campo">
                    Link (Google Drive, site ou outro)
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://drive.google.com/..."
                      value={refLink}
                      onChange={(e) => {
                        setRefLink(e.target.value);
                        setErroRef(null);
                      }}
                    />
                  </label>
                )}

                {referenciaPronta && (
                  <div className="admin-imagem-campos">
                    <label>
                      Como citar (opcional)
                      <input
                        maxLength={300}
                        placeholder="Ex.: Prefeitura de Guarulhos, Inventário do Patrimônio, 2024"
                        value={refDescricao}
                        onChange={(e) => setRefDescricao(e.target.value)}
                      />
                    </label>

                    <div>
                      <button
                        type="button"
                        className="btn-solid"
                        disabled={ocupado}
                        onClick={enviarReferencia}
                      >
                        {enviandoRef ? (
                          <>
                            <ArrowPathIcon
                              width={16}
                              height={16}
                              className="icon-spin"
                            />
                            Anexando…
                          </>
                        ) : (
                          "Adicionar referência"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {erroRef && (
                  <p className="admin-form-erro" role="alert">
                    {erroRef}
                  </p>
                )}

                {!eAdmin && referencias.length > 0 && (
                  <p className="admin-aviso-texto">
                    Somente administradores podem remover referências.
                  </p>
                )}
              </div>
            )}
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
          <p className="admin-form-erro" role="alert">
            {erroFormulario}
          </p>
        )}

        <div className="admin-form-acoes">
          <button type="submit" className="btn-solid" disabled={ocupado}>
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
            disabled={ocupado}
            onClick={cancelarFormulario}
          >
            Cancelar
          </button>
        </div>
      </form>

      {editandoId !== "novo" && (
        <AdminLigacoes
          key={editandoId}
          patrimonioId={editandoId}
          status={statusEdicao}
          perfil={usuario?.perfil}
          bloqueado={
            salvando ||
            operandoImagem ||
            operandoReferencia ||
            salvandoRegiao ||
            carregandoEdicao
          }
          onBusyChange={aoMudarOcupadoLigacoes}
        />
      )}
    </>
  );
}
