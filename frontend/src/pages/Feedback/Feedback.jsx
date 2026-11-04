import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { criarEnvioFeedback, enviarFeedback } from "../../services/feedbackPublicoApi";
import { feedbackAtivo, TIPOS_FEEDBACK, prepararFeedback, contarComentario, envioExpirou } from "../../utils/feedbackPublico";
import styles from "./Feedback.module.css";

function falhaPublica(error) {
  if (error.codigo === "AVISO_DESATUALIZADO") return { estado: "aviso", texto: "O aviso de privacidade mudou. O conteúdo foi preservado. Aguarde o aviso atualizado nesta página e revise-o antes de um novo envio." };
  if (error.codigo === "CHAVE_REUTILIZADA") return { estado: "conflito", texto: "Não foi possível confirmar este envio: sua chave já está associada a outro conteúdo. Nenhuma nova chave será criada sem sua escolha." };
  if (error.codigo === "ENVIO_EXPIRADO") return { estado: "expirado", texto: "A garantia de repetição de 24 horas terminou. A tentativa anterior pode ter sido recebida. Não reenviaremos automaticamente." };
  if (error.codigo === "FEEDBACK_DESATIVADO") return { estado: "desativado", texto: "O recebimento de feedback está desativado. Seu comentário foi preservado; não há confirmação de recebimento." };
  if (error.status === 429) return { estado: "limite", texto: "O limite temporário de envios foi atingido. Aguarde antes de tentar novamente; isso não garante que o serviço estará disponível." };
  if (error.status === 400) return { estado: "rejeitado", texto: "O envio não foi aceito. Revise o tipo e os caracteres do comentário antes de uma nova tentativa." };
  if (error.status === 413) return { estado: "rejeitado", texto: "O corpo do envio excedeu o limite permitido. Reduza o comentário antes de uma nova tentativa." };
  if (error.status === 415) return { estado: "rejeitado", texto: "O formato do envio não foi aceito. O comentário foi preservado. Tente novamente após a atualização da página." };
  if ([401, 403].includes(error.status)) return { estado: "rejeitado", texto: "Este envio não foi autorizado pelo portal. O comentário foi preservado. Não é necessário fazer login para avaliar o portal." };
  if (error.status >= 500) return { estado: "servico", texto: "O serviço de feedback está indisponível. Não foi possível confirmar o recebimento; a tentativa pode ter sido recebida." };
  return { estado: "incerto", texto: "Não foi possível confirmar o recebimento. A tentativa pode ter sido recebida, mesmo se a conexão foi interrompida." };
}

export default function Feedback() {
  return <section className={styles.pagina} aria-labelledby="feedback-titulo">
    <header className={styles.cabecalho}>
      <p className={styles.sobre}>Experiência no portal</p>
      <h1 id="feedback-titulo">Avaliar o portal</h1>
      <p>Ajude a melhorar a navegação e as informações deste site.</p>
    </header>
    {feedbackAtivo() ? <FormularioFeedback /> : <div className={styles.cartao}>
      <h2>Feedback indisponível</h2>
      <p>O formulário de avaliação ainda não está disponível.</p>
      <p>Para outros assuntos, consulte os <Link to="/contato">canais de contato</Link>.</p>
    </div>}
  </section>;
}

function FormularioFeedback() {
  const [tipo, setTipo] = useState(""), [mensagem, setMensagem] = useState("");
  const [erros, setErros] = useState({}), [pendente, setPendente] = useState(null);
  const [resultado, setResultado] = useState({ estado: "pronto", texto: "" });
  const [confirmarEdicao, setConfirmarEdicao] = useState(false), [avisoMudou, setAvisoMudou] = useState(false);
  const [esperarAte, setEsperarAte] = useState(0), [agora, setAgora] = useState(Date.now);
  const ocupado = useRef(false), requisicao = useRef(null), montado = useRef(false);
  const tipoRef = useRef(null), mensagemRef = useRef(null), statusRef = useRef(null), decisaoRef = useRef(null);
  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; requisicao.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!pendente && esperarAte <= Date.now()) return;
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pendente, esperarAte]);
  useEffect(() => {
    if (!["pronto", "validacao", "enviando"].includes(resultado.estado)) statusRef.current?.focus();
  }, [resultado]);
  useEffect(() => { if (confirmarEdicao) decisaoRef.current?.focus(); }, [confirmarEdicao]);

  const enviando = resultado.estado === "enviando";
  const expirado = pendente && !enviando && (resultado.estado === "expirado" || envioExpirou(pendente, agora));
  const restante = Math.max(0, Math.ceil((esperarAte - agora) / 1000));
  const podeReenviar = pendente && !expirado && ["incerto", "limite", "servico"].includes(resultado.estado);
  const contador = contarComentario(mensagem);

  async function transmitir(envio) {
    if (ocupado.current || Date.now() < esperarAte || !feedbackAtivo()) return;
    if (envioExpirou(envio)) { setResultado(falhaPublica({ codigo: "ENVIO_EXPIRADO" })); return; }
    ocupado.current = true;
    const controller = new AbortController(); requisicao.current = controller;
    setResultado({ estado: "enviando", texto: "Enviando feedback…" });
    try {
      const r = await enviarFeedback(envio, { signal: controller.signal });
      if (!montado.current || requisicao.current !== controller) return;
      setPendente(null); setMensagem(""); setTipo(""); setErros({}); setConfirmarEdicao(false);
      setResultado({ estado: "recebido", texto: r.demonstracao
        ? "Demonstração: feedback recebido apenas em memória. São dados demonstrativos, descartados ao reiniciar; não houve gravação persistente no banco."
        : "Feedback recebido. Obrigado por ajudar a melhorar o portal." });
    } catch (error) {
      if (!montado.current || requisicao.current !== controller) return;
      const agora = Date.now(); setAgora(agora);
      if (Number.isFinite(error.retryMs) && error.retryMs > 0) setEsperarAte(agora + error.retryMs);
      if (error.codigo === "AVISO_DESATUALIZADO") setAvisoMudou(true);
      setResultado(falhaPublica(error));
    } finally {
      if (requisicao.current === controller) { ocupado.current = false; requisicao.current = null; }
    }
  }
  function submeter(event) {
    event.preventDefault();
    if (ocupado.current || pendente || avisoMudou || Date.now() < esperarAte || !feedbackAtivo()) return;
    const validacao = prepararFeedback(tipo, mensagem); setErros(validacao.erros);
    if (Object.keys(validacao.erros).length) {
      setResultado({ estado: "validacao", texto: "Revise os campos indicados antes de enviar." });
      (validacao.erros.tipo ? tipoRef : mensagemRef).current?.focus(); return;
    }
    try {
      const envio = criarEnvioFeedback(tipo, mensagem);
      setPendente(envio); setMensagem(envio.payload.mensagem); setAgora(Date.now());
      void transmitir(envio);
    } catch {
      setResultado({ estado: "rejeitado", texto: "Não foi possível preparar um envio seguro. Use um navegador atualizado e tente novamente." });
    }
  }
  function voltarAEditar() {
    if (ocupado.current) return;
    setPendente(null); setConfirmarEdicao(false);
    setResultado({ estado: "pronto", texto: "" });
    mensagemRef.current?.focus();
  }

  return <div className={styles.cartao}>
    <div className={styles.finalidade}>
      <h2>Sobre sua experiência</h2>
      <p>Envie um elogio, sugestão ou problema de uso. Este formulário não gera protocolo de atendimento e não substitui a Ouvidoria.</p>
      <p>Para denúncias, reclamações formais ou pedidos de atendimento, consulte os <Link to="/contato">canais de contato</Link>.</p>
    </div>
    <form onSubmit={submeter} noValidate aria-label="Avaliação do portal" aria-busy={enviando}>
      <fieldset className={styles.tipos} disabled={Boolean(pendente)} aria-describedby={erros.tipo ? "feedback-tipo-ajuda feedback-tipo-erro" : "feedback-tipo-ajuda"}>
        <legend>Tipo de feedback <span>(obrigatório)</span></legend>
        <p id="feedback-tipo-ajuda" className={styles.ajuda}>Escolha a opção que melhor descreve seu comentário.</p>
        <div className={styles.opcoes}>
          {TIPOS_FEEDBACK.map((t, i) => <label key={t.valor}>
            <input ref={i === 0 ? tipoRef : undefined} type="radio" name="tipoFeedback" value={t.valor}
              checked={tipo === t.valor} onChange={() => setTipo(t.valor)} required aria-invalid={Boolean(erros.tipo)}
              aria-describedby={erros.tipo ? "feedback-tipo-erro" : undefined} />
            {t.rotulo}
          </label>)}
        </div>
        {erros.tipo && <p id="feedback-tipo-erro" className={styles.erro}>{erros.tipo}</p>}
      </fieldset>
      <div className={styles.campo}>
        <label htmlFor="feedback-mensagem">Comentário <span>(obrigatório)</span></label>
        <p id="feedback-mensagem-ajuda" className={styles.ajuda}>Não inclua senhas, documentos, dados sensíveis ou informações de outras pessoas.</p>
        <textarea ref={mensagemRef} id="feedback-mensagem" name="comentarioFeedback" rows={7} value={mensagem}
          onChange={e => setMensagem(e.target.value)} readOnly={Boolean(pendente)} required
          aria-invalid={Boolean(erros.mensagem)} aria-describedby={`feedback-mensagem-ajuda feedback-contador${erros.mensagem ? " feedback-mensagem-erro" : ""}`} />
        <p id="feedback-contador" className={contador > 2000 ? styles.erro : styles.ajuda}>{contador.toLocaleString("pt-BR")} / 2.000 caracteres após a normalização.</p>
        {erros.mensagem && <p id="feedback-mensagem-erro" className={styles.erro}>{erros.mensagem}</p>}
      </div>
      <aside className={styles.aviso} aria-labelledby="feedback-aviso-titulo">
        <h3 id="feedback-aviso-titulo">Privacidade — aviso provisório</h3>
        <p>Texto para desenvolvimento, ainda sem aprovação institucional. O comentário é destinado à equipe administradora para melhorar o portal; não há promessa de resposta individual.</p>
        <p>A política técnica provisória prevê 180 dias para o comentário e 24 horas para a confirmação do envio. O texto pode conter dados pessoais; não há garantia de anonimato absoluto.</p>
        <p>Versão do aviso: feedback-v1.</p>
      </aside>
      {avisoMudou && <p className={styles.erro}>Novos envios estão bloqueados nesta página até que o aviso atualizado esteja disponível. Seu comentário permanece somente nesta aba.</p>}
      {!pendente && <button className={styles.primario} type="submit" disabled={enviando || avisoMudou || restante > 0}>Enviar feedback</button>}
      <div className={styles.status} role="status" aria-live="polite" aria-atomic="true" tabIndex={-1} ref={statusRef}>
        {expirado ? falhaPublica({ codigo: "ENVIO_EXPIRADO" }).texto : resultado.texto}
      </div>
      {restante > 0 && <p className={styles.ajuda}>Aguarde pelo menos {restante} segundos antes de outra tentativa. A disponibilidade não é garantida.</p>}
      {pendente && <div className={styles.pendente}>
        <p>O comentário e a chave deste envio ficam apenas na memória desta página. Ao sair, fechar ou recarregar, você perde a possibilidade de repetir este envio com a mesma chave.</p>
        {enviando ? <p>Aguarde a confirmação. Interromper a conexão não desfaz um possível recebimento.</p> : <>
          {podeReenviar && <button type="button" className={styles.primario} disabled={restante > 0} onClick={() => void transmitir(pendente)}>Reenviar o mesmo feedback</button>}
          <button type="button" className={styles.secundario} onClick={() => setConfirmarEdicao(true)}>
            {expirado ? "Preparar uma nova submissão" : "Editar ou abandonar esta tentativa"}
          </button>
          {confirmarEdicao && <section className={styles.decisao} aria-labelledby="feedback-decisao">
            <h3 id="feedback-decisao" tabIndex={-1} ref={decisaoRef}>A tentativa anterior pode ter sido recebida</h3>
            <p>Ao continuar, você abandona a chave anterior e mantém o comentário para revisão. Um novo envio só acontecerá se você clicar novamente em “Enviar feedback” e poderá duplicar a contribuição anterior.</p>
            <button type="button" className={styles.secundario} onClick={voltarAEditar}>Entendi, voltar ao comentário</button>
            <button type="button" className={styles.secundario} onClick={() => { setConfirmarEdicao(false); statusRef.current?.focus(); }}>Manter a tentativa atual</button>
          </section>}
        </>}
      </div>}
    </form>
  </div>;
}
