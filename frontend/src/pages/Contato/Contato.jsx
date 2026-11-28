import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  InformationCircleIcon,
  XMarkIcon,
  MapPinIcon,
  EnvelopeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

import { FormularioFeedback } from "../Feedback/Feedback";
import { feedbackAtivo } from "../../utils/feedbackPublico";
import { faixaLivre } from "./faixaLivre";
import "./Contato.css";

/**
 * CONSTANTES DE CONTATO
 * -------------------------------------------------------------------------
 * URL_FALA_BR é o endereço da plataforma federal Fala.BR.
 * URL_OUVIDORIA ainda aponta para o portal da Prefeitura: troque pelo link
 * direto da Ouvidoria quando ele for confirmado.
 * EMAIL_PATRIMONIO veio do contato.html original.
 */
const PORTAL_PREFEITURA = "https://www.guarulhos.sp.gov.br";
const URL_FALA_BR = "https://falabr.cgu.gov.br";
const URL_OUVIDORIA = PORTAL_PREFEITURA;
const EMAIL_PATRIMONIO = "patrimonio.cultural@guarulhos.sp.gov.br";

export default function Contato() {
  const [infoAberta, setInfoAberta] = useState(false);
  const acionadorRef = useRef(null);
  const fecharRef = useRef(null);
  const devolverFoco = useRef(false);
  const paginaRef = useRef(null);
  const painelRef = useRef(null);

  useLayoutEffect(() => {
    const pagina = paginaRef.current;
    const fab = acionadorRef.current;
    const painel = painelRef.current;
    let frame;
    let referenciaFoco = null;
    const limparPosicao = (elemento, completo = false) => {
      for (const propriedade of completo ? ["top", "bottom", "max-height"] : ["top", "bottom"]) {
        elemento?.style.removeProperty(propriedade);
      }
    };
    const atualizar = () => {
      limparPosicao(fab);
      limparPosicao(painel);
      const margem = 8;
      const inicio = Math.max(margem, (document.querySelector(".navbar")?.getBoundingClientRect().bottom ?? 0) + margem);
      const fim = window.innerHeight - margem;
      const foco = document.activeElement;
      const focoExterno = foco?.matches("a, button, input, select, textarea, [tabindex]") &&
        !fab.contains(foco) && !painel?.contains(foco) ? foco : null;
      // Mantém a posição ao entrar na superfície: mover o botão entre
      // pointerdown e click poderia impedir seu acionamento.
      if (focoExterno) referenciaFoco = focoExterno.closest("label") ?? focoExterno;
      if (!referenciaFoco?.isConnected) referenciaFoco = null;
      const posicionar = (elemento, obstaculos, limitarAltura = false) => {
        const caixa = elemento.getBoundingClientRect();
        if (!caixa.height) return; // Sem geometria durante montagem/ambientes sem layout.
        const estilo = getComputedStyle(elemento);
        const altura = limitarAltura
          ? Math.max(caixa.height, elemento.scrollHeight + parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth))
          : caixa.height;
        const bloqueios = obstaculos.filter(Boolean).map(e => e.getBoundingClientRect())
          .filter(r => r.width && r.height && r.left < caixa.right + margem && r.right > caixa.left - margem)
          .map(r => [r.top - margem, r.bottom + margem]);
        const faixa = faixaLivre(inicio, fim, altura, caixa.bottom - altura, bloqueios);
        if (!faixa) return;
        elemento.style.top = `${faixa.top}px`;
        elemento.style.bottom = "auto";
        if (limitarAltura) elemento.style.maxHeight = `${faixa.maxHeight}px`;
      };
      posicionar(fab, [...pagina.querySelectorAll("textarea"), referenciaFoco]);
      if (painel) posicionar(painel, [fab, referenciaFoco], true);
    };
    const agendar = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(atualizar);
    };
    atualizar();
    window.addEventListener("scroll", agendar, true);
    window.addEventListener("resize", agendar);
    document.addEventListener("focusin", agendar);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(agendar);
    observer?.observe(pagina);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", agendar, true);
      window.removeEventListener("resize", agendar);
      document.removeEventListener("focusin", agendar);
      observer?.disconnect();
      limparPosicao(fab, true);
      limparPosicao(painel, true);
    };
  }, [infoAberta]);

  function fecharInformacoes() {
    devolverFoco.current = true;
    setInfoAberta(false);
  }

  // Fecha o card de informações com Esc. O listener só existe enquanto o
  // card está aberto (dependência: infoAberta) e é removido no cleanup.
  useEffect(() => {
    if (!infoAberta) {
      if (devolverFoco.current) {
        devolverFoco.current = false;
        if (acionadorRef.current?.isConnected) {
          acionadorRef.current.focus({ preventScroll: true });
        }
      }
      return;
    }
    fecharRef.current?.focus({ preventScroll: true });
    const aoTeclar = (e) => {
      if (e.key === "Escape") fecharInformacoes();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [infoAberta]);

  return (
    <div ref={paginaRef} className="contato-pagina">
      <div className="page-hero">
        <h1>Fale conosco</h1>
        <p>
          Avalie sua experiência no portal ou escolha um canal institucional
          para assuntos sobre o patrimônio cultural de Guarulhos.
        </p>
      </div>

      {/* O formulário público usa o contrato de Feedback; contato institucional abaixo. */}
      <section className="sobre" style={{ marginTop: 0 }}>
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <h2>Avaliar o portal</h2>
              <p className="sub">
                Compartilhe um elogio, uma sugestão ou um problema de uso do site.
                Para dúvidas sobre bens, envio de fotos ou pedidos de visita,
                utilize os canais institucionais abaixo.
              </p>
            </div>
          </div>

          {feedbackAtivo() ? <FormularioFeedback /> : <div className="contato-form contato-indisponivel" role="status">
            <InformationCircleIcon width={28} height={28} aria-hidden="true" />
            <div>
              <h3>Feedback indisponível</h3>
              <p>O formulário de avaliação ainda não está disponível. Nenhuma mensagem foi enviada.</p>
              <p>Utilize os canais de contato abaixo para outros assuntos.</p>
            </div>
          </div>}
        </div>
      </section>

      {/* ===== Outras formas de contato ===== */}
      <section className="sobre" id="canais-contato">
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <h2>Outras formas de contato</h2>
              <p className="sub">
                Para assuntos sobre patrimônios, escreva para{" "}
                <a href={`mailto:${EMAIL_PATRIMONIO}`}>{EMAIL_PATRIMONIO}</a>.
                Para acesso à informação e atendimento geral, consulte os canais abaixo:
              </p>
            </div>
          </div>

          <div className="canais-grid">
            <article className="canal-card">
              <header className="canal-head">
                <h3>Fala.BR</h3>
                <p>Transparência passiva</p>
              </header>
              <div className="canal-body">
                <div>
                  <h4>Pedido de acesso à informação</h4>
                  <p>Para informações que a Administração já disponha, como:</p>
                  <ul className="canal-list">
                    <li>Informações sobre atividades exercidas pelos órgãos</li>
                    <li>
                      Acompanhamento e resultado de programas e ações dos órgãos
                    </li>
                  </ul>
                </div>
                <p className="canal-aviso">
                  <strong>Atenção:</strong> algumas informações já estão nos
                  portais da Prefeitura, a chamada{" "}
                  <strong>transparência ativa</strong>. Exemplos: contratos,
                  leis municipais e estrutura organizacional.
                </p>
                <a
                  className="canal-btn"
                  href={URL_FALA_BR}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Acessar Fala.BR
                </a>
              </div>
            </article>

            <article className="canal-card">
              <header className="canal-head">
                <h3>Fale Conosco</h3>
                <p>Ouvidoria e unidades FÁCIL</p>
              </header>
              <div className="canal-body">
                <div>
                  <h4>Ouvidoria</h4>
                  <ul className="canal-list">
                    <li>Reclamação</li>
                    <li>Elogio</li>
                    <li>Sugestão</li>
                  </ul>
                </div>
                <div>
                  <h4>Unidades FÁCIL</h4>
                  <p>Serviços como:</p>
                  <ul className="canal-list">
                    <li>Multas, impostos e licenças</li>
                    <li>Poda e remoção de árvores</li>
                    <li>Fiscalizações e pedidos de certidões</li>
                    <li>Tapa-buracos e vigilância sanitária, entre outros</li>
                  </ul>
                </div>
                <a
                  className="canal-btn"
                  href={URL_OUVIDORIA}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Acessar Ouvidoria
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===== Informações institucionais (card flutuante) ===== */}
      {infoAberta && (
        <aside
          ref={painelRef}
          id="contato-info"
          className="contato-pop"
          role="dialog"
          aria-label="Informações institucionais"
        >
          <div className="contato-pop-head">
            <h3>Informações institucionais</h3>
            <button
              ref={fecharRef}
              type="button"
              className="contato-pop-close"
              aria-label="Fechar informações"
              onClick={fecharInformacoes}
            >
              <XMarkIcon width={18} height={18} />
            </button>
          </div>
          <ul className="contato-pop-list">
            <li>
              <MapPinIcon width={20} height={20} />
              <div>
                <strong>Endereço</strong>
                <span>Av. Bom Clima, nº 91, Guarulhos - SP, 07196-220</span>
              </div>
            </li>
            <li>
              <EnvelopeIcon width={20} height={20} />
              <div>
                <strong>E-mail oficial</strong>
                <a href={`mailto:${EMAIL_PATRIMONIO}`}>{EMAIL_PATRIMONIO}</a>
              </div>
            </li>
            <li>
              <ClockIcon width={20} height={20} />
              <div>
                <strong>Horário de atendimento</strong>
                <span>Segunda a sexta-feira, das 8h às 17h</span>
              </div>
            </li>
          </ul>
        </aside>
      )}

      <button
        ref={acionadorRef}
        type="button"
        className="contato-fab"
        aria-label="Informações institucionais"
        aria-expanded={infoAberta}
        aria-controls="contato-info"
        onClick={() => infoAberta ? fecharInformacoes() : setInfoAberta(true)}
      >
        <InformationCircleIcon width={26} height={26} />
      </button>
    </div>
  );
}
