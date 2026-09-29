import { useEffect, useState } from "react";
import {
  InformationCircleIcon,
  XMarkIcon,
  MapPinIcon,
  EnvelopeIcon,
  ClockIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

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

const motivos = [
  { value: "duvida", label: "Dúvida sobre um patrimônio" },
  { value: "contribuicao", label: "Envio de informações ou fotos" },
  { value: "denuncia", label: "Relatar dano ou preservação" },
  { value: "outro", label: "Outro assunto" },
];

const FORM_INICIAL = { nome: "", email: "", motivo: "duvida", mensagem: "" };

export default function Contato() {
  const [form, setForm] = useState(FORM_INICIAL);
  const [infoAberta, setInfoAberta] = useState(false);

  // Fecha o card de informações com Esc. O listener só existe enquanto o
  // card está aberto (dependência: infoAberta) e é removido no cleanup.
  useEffect(() => {
    if (!infoAberta) return;
    const aoTeclar = (e) => {
      if (e.key === "Escape") setInfoAberta(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [infoAberta]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  /**
   * Ainda não existe endpoint de contato no backend. Por isso o envio abre o
   * aplicativo de e-mail do visitante com a mensagem preenchida (mailto).
   * Quando a rota real existir, troque este corpo por uma chamada em
   * services/api.js.
   */
  function handleSubmit(e) {
    e.preventDefault();
    const assunto =
      motivos.find((m) => m.value === form.motivo)?.label ?? "Contato";
    const corpo = `Nome: ${form.nome}\nE-mail: ${form.email}\n\n${form.mensagem}`;
    window.location.href = `mailto:${EMAIL_PATRIMONIO}?subject=${encodeURIComponent(
      assunto,
    )}&body=${encodeURIComponent(corpo)}`;
  }

  return (
    <div>
      <div className="page-hero">
        <h1>Fale conosco</h1>
        <p>
          Escolha o canal certo para o seu assunto ou envie uma mensagem
          diretamente para a equipe de Patrimônio Cultural de Guarulhos.
        </p>
      </div>

      {/* ===== Canais de atendimento ===== */}
      <section className="sobre" style={{ marginTop: 0 }}>
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <h2>Quando usar cada canal</h2>
              <p className="sub">
                A Prefeitura atende por dois canais principais. Veja qual deles
                resolve o seu caso.
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

      {/* ===== Formulário ===== */}
      <section className="sobre">
        <div className="sobre-inner">
          <div className="section-head">
            <div>
              <h2>Fale com o Patrimônio Cultural</h2>
              <p className="sub">
                Dúvidas sobre um bem tombado, sugestões de conteúdo, fotos e
                relatos de danos ao patrimônio.
              </p>
            </div>
          </div>

          <form className="contato-form" onSubmit={handleSubmit}>
            <div className="contato-field">
              <label htmlFor="nome">Nome completo</label>
              <input
                id="nome"
                name="nome"
                type="text"
                placeholder="Digite seu nome"
                value={form.nome}
                onChange={handleChange}
                required
              />
            </div>

            <div className="contato-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="contato-field">
              <label htmlFor="motivo">Assunto</label>
              <select
                id="motivo"
                name="motivo"
                value={form.motivo}
                onChange={handleChange}
              >
                {motivos.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="contato-field">
              <label htmlFor="mensagem">Mensagem</label>
              <textarea
                id="mensagem"
                name="mensagem"
                placeholder="Escreva sua mensagem aqui..."
                value={form.mensagem}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="contato-submit">
              <PaperAirplaneIcon width={16} height={16} />
              Enviar mensagem
            </button>
            <p className="contato-nota">
              Ao enviar, abriremos o seu aplicativo de e-mail com a mensagem já
              preenchida.
            </p>
          </form>
        </div>
      </section>

      {/* ===== Informações institucionais (card flutuante) ===== */}
      {infoAberta && (
        <aside
          id="contato-info"
          className="contato-pop"
          role="dialog"
          aria-label="Informações institucionais"
        >
          <div className="contato-pop-head">
            <h3>Informações institucionais</h3>
            <button
              type="button"
              className="contato-pop-close"
              aria-label="Fechar informações"
              onClick={() => setInfoAberta(false)}
            >
              <XMarkIcon width={18} height={18} />
            </button>
          </div>
          <ul className="contato-pop-list">
            <li>
              <MapPinIcon width={20} height={20} />
              <div>
                <strong>Endereço</strong>
                <span>
                  Av. Paulo Faccini, nº 629 - Centro, Guarulhos - SP, 07097-000
                </span>
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
        type="button"
        className="contato-fab"
        aria-label="Informações institucionais"
        aria-expanded={infoAberta}
        aria-controls="contato-info"
        onClick={() => setInfoAberta((aberta) => !aberta)}
      >
        <InformationCircleIcon width={26} height={26} />
      </button>
    </div>
  );
}
