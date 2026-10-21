import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
// Somente a estrutura leve do modal entra no site público. O formulário
// completo é carregado sob demanda, mantendo o modal visível nesse período.
const PatrimonioEditor = lazy(() => import("./PatrimonioEditor"));
import "../admin.css";
import "../admin-extras.css";
import "./EditarPatrimonioModal.css";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const AVISO_DESCARTAR =
  "Há alterações não salvas neste formulário. Fechar e descartá-las?\n\n" +
  "Imagens, referências, regiões e ligações já enviadas continuam salvas.";

/**
 * Modal de edição administrativa (D3E). Usa o MESMO PatrimonioEditor do
 * dashboard. Só deve ser montado para ADMIN (quem monta decide).
 *
 * Props:
 *  - uuid: UUID real do patrimônio (a API admin não aceita slug).
 *  - nome: texto de apoio no cabeçalho.
 *  - onSalvo({ uuid, dados }): chamado (e aguardado) depois que a gravação
 *    principal conclui; o modal fecha em seguida.
 *  - onClose({ atualizar }): modal fechado. `atualizar: true` quando algo foi
 *    gravado na hora (imagem, referência, ligação) sem passar pelo Salvar.
 */
export default function EditarPatrimonioModal({
  uuid,
  nome,
  onSalvo,
  onClose,
}) {
  const tituloId = useId();
  const dialogRef = useRef(null);
  const backdropMouseDownRef = useRef(false);
  const ocupadoRef = useRef(false);
  const sujoRef = useRef(false);
  const remotoMudouRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const fechar = useCallback(() => {
    onCloseRef.current?.({ atualizar: remotoMudouRef.current });
  }, []);

  // Fechar por botão / Esc / backdrop: nunca durante gravação ou upload e
  // sempre perguntando antes de descartar alterações locais.
  const solicitarFechar = useCallback(() => {
    if (ocupadoRef.current) return;
    if (sujoRef.current && !window.confirm(AVISO_DESCARTAR)) return;
    fechar();
  }, [fechar]);

  const aoBusy = useCallback((valor) => {
    ocupadoRef.current = valor;
    setOcupado(valor);
  }, []);
  const aoSujo = useCallback((valor) => {
    sujoRef.current = valor;
  }, []);
  const aoRemoto = useCallback(() => {
    remotoMudouRef.current = true;
  }, []);

  async function aoSalvar({ criado, uuid: salvoUuid, dados }) {
    if (criado) return; // o modal só edita; "novo" não é usado aqui
    try {
      await onSalvo?.({ uuid: salvoUuid, dados });
    } catch {
      // Falha ao atualizar a ficha atrás do modal não desfaz a gravação.
    }
    remotoMudouRef.current = false; // a ficha já foi atualizada
    fechar();
  }

  function aoCancelarEditor({ forcar } = {}) {
    if (forcar) fechar();
    else solicitarFechar();
  }

  // Foco, rolagem do fundo, Esc e contenção de foco.
  useEffect(() => {
    const gatilho = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    // Outro diálogo (ex.: modal global de erro) tem prioridade sobre este.
    const emOutroDialogo = (alvo) => {
      const outro = alvo?.closest?.(
        '[role="dialog"], [role="alertdialog"], [aria-modal="true"]',
      );
      return Boolean(outro && outro !== dialogRef.current);
    };

    function aoTeclar(e) {
      if (emOutroDialogo(e.target)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        solicitarFechar();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focaveis = [...dialogRef.current.querySelectorAll(FOCAVEIS)].filter(
        (el) => !el.closest("[inert]") && el.getClientRects().length > 0,
      );
      const ativo = document.activeElement;

      if (focaveis.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const dentro = dialogRef.current.contains(ativo) && ativo !== dialogRef.current;

      if (!dentro) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primeiro).focus();
      } else if (e.shiftKey && ativo === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      if (gatilho instanceof HTMLElement && gatilho.isConnected) {
        gatilho.focus({ preventScroll: true });
      }
    };
  }, [solicitarFechar]);

  return createPortal(
    <div
      className="d3e-modal-backdrop"
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Só fecha se o clique começou E terminou no fundo (arrastar texto
        // de um campo para fora do modal não deve fechá-lo).
        if (e.target === e.currentTarget && backdropMouseDownRef.current) {
          solicitarFechar();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="d3e-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
      >
        <header className="d3e-modal-head">
          <div>
            <h2 id={tituloId}>Editar patrimônio</h2>
            {nome && <p>{nome}</p>}
          </div>
          <button
            type="button"
            className="d3e-modal-fechar"
            aria-label="Fechar edição"
            title={ocupado ? "Aguarde a operação terminar" : "Fechar (Esc)"}
            disabled={ocupado}
            onClick={solicitarFechar}
          >
            <XMarkIcon width={20} height={20} />
          </button>
        </header>

        {/* .admin-shell traz os tokens e estilos do painel; a classe
            d3e-modal-shell neutraliza o layout de tela cheia dele. */}
        <div className="d3e-modal-corpo">
          <div className="admin-shell d3e-modal-shell">
            <Suspense
              fallback={
                <div className="d3e-modal-preparando" role="status">
                  <p>Preparando editor…</p>
                  <div className="d3e-modal-preparando-linhas" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              }
            >
              <PatrimonioEditor
                key={uuid}
                idInicial={uuid}
                semTitulo
                rolarAoAbrir={false}
                onSaved={aoSalvar}
                onCancel={aoCancelarEditor}
                onBusyChange={aoBusy}
                onDirtyChange={aoSujo}
                onRemoteChange={aoRemoto}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
