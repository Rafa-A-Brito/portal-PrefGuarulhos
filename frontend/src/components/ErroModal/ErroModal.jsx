import { useEffect, useRef, useState } from "react";
import {
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

/**
 * Modal de erro. A mensagem é genérica (para o usuário); o bloco técnico
 * (código, origem, referência...) existe para o dev identificar o problema
 * a partir de um print.
 *
 * O campo "Detalhe" (texto técnico já sanitizado) só aparece em
 * desenvolvimento, ou se VITE_MOSTRAR_DETALHES_ERRO=true. Em produção o
 * usuário vê apenas código, origem e referência, sem pistas sobre a
 * infraestrutura.
 */
const MOSTRAR_DETALHE =
  import.meta.env.DEV || import.meta.env.VITE_MOSTRAR_DETALHES_ERRO === "true";

function formatarQuando(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function montarTexto(erro) {
  const linhas = [
    `Código: ${erro.codigo}`,
    `Referência: ${erro.id}`,
    `Origem: ${erro.origem}`,
    erro.status ? `Status HTTP: ${erro.status}` : null,
    `Quando: ${formatarQuando(erro.quando)}`,
    MOSTRAR_DETALHE && erro.detalhe ? `Detalhe: ${erro.detalhe}` : null,
  ];

  return linhas.filter(Boolean).join("\n");
}

export default function ErroModal({ erro, onFechar, rotuloFechar = "Fechar" }) {
  const dialogoRef = useRef(null);
  const fecharRef = useRef(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!erro) return undefined;

    const anterior = document.activeElement;
    fecharRef.current?.focus();

    function aoTeclar(e) {
      if (e.key === "Escape") {
        onFechar();
        return;
      }

      // Mantém o foco dentro do modal enquanto ele está aberto.
      if (e.key === "Tab") {
        const focaveis = dialogoRef.current?.querySelectorAll("button");
        if (!focaveis?.length) return;

        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      anterior?.focus?.();
    };
  }, [erro, onFechar]);

  if (!erro) return null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(montarTexto(erro));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão para a área de transferência: o print resolve.
    }
  }

  return (
    <div
      className="erro-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={dialogoRef}
        className="erro-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="erro-modal-titulo"
        aria-describedby="erro-modal-mensagem"
      >
        <div className="erro-modal-topo">
          <span className="erro-modal-icone">
            <ExclamationTriangleIcon width={24} height={24} />
          </span>
          <div>
            <h2 id="erro-modal-titulo">Algo deu errado</h2>
            <p id="erro-modal-mensagem">{erro.mensagem}</p>
          </div>
        </div>

        <dl className="erro-modal-tecnico">
          <div>
            <dt>Código</dt>
            <dd>{erro.codigo}</dd>
          </div>
          <div>
            <dt>Referência</dt>
            <dd>{erro.id}</dd>
          </div>
          <div>
            <dt>Origem</dt>
            <dd>{erro.origem}</dd>
          </div>
          {erro.status && (
            <div>
              <dt>Status HTTP</dt>
              <dd>{erro.status}</dd>
            </div>
          )}
          <div>
            <dt>Quando</dt>
            <dd>{formatarQuando(erro.quando)}</dd>
          </div>
          {MOSTRAR_DETALHE && erro.detalhe && (
            <div className="erro-modal-detalhe">
              <dt>Detalhe</dt>
              <dd>{erro.detalhe}</dd>
            </div>
          )}
        </dl>

        <p className="erro-modal-dica">
          Se o problema continuar, envie um print desta janela para a equipe de
          suporte.
        </p>

        <div className="erro-modal-acoes">
          <button type="button" className="btn-outline" onClick={copiar}>
            {copiado ? (
              <CheckIcon width={16} height={16} />
            ) : (
              <ClipboardDocumentIcon width={16} height={16} />
            )}
            {copiado ? "Copiado" : "Copiar detalhes"}
          </button>

          <button
            ref={fecharRef}
            type="button"
            className="btn-solid"
            onClick={onFechar}
          >
            {rotuloFechar}
          </button>
        </div>
      </div>
    </div>
  );
}
