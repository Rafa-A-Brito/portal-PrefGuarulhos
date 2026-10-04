import { useCallback, useEffect, useMemo, useState } from "react";
import ErroModal from "../components/ErroModal/ErroModal";
import { normalizarErro } from "../utils/erros";
import { ErroModalContext } from "./erroModalContextInstance";

/**
 * Um único modal de erro para o app inteiro. Qualquer tela chama
 * mostrarErro(err, opcoes) dentro de um catch; o Provider normaliza o erro,
 * registra no console e abre o modal.
 *
 * Além disso, promessas que ninguém tratou (unhandledrejection) também caem
 * aqui, então um erro "esquecido" aparece em vez de sumir no console.
 */
export function ErroModalProvider({ children }) {
  const [erro, setErro] = useState(null);

  const mostrarErro = useCallback((err, opcoes) => {
    const normalizado = normalizarErro(err, opcoes);
    console.error(`[${normalizado.codigo}] ${normalizado.origem}`, err);
    setErro(normalizado);
    return normalizado.id;
  }, []);

  const fecharErro = useCallback(() => setErro(null), []);

  useEffect(() => {
    function aoRejeitar(evento) {
      const motivo = evento.reason;
      // Requisição cancelada de propósito (AbortController) não é erro.
      if (motivo?.name === "CanceledError" || motivo?.name === "AbortError") {
        return;
      }
      mostrarErro(motivo, { origem: "Promessa sem tratamento" });
    }

    window.addEventListener("unhandledrejection", aoRejeitar);
    return () => window.removeEventListener("unhandledrejection", aoRejeitar);
  }, [mostrarErro]);

  const value = useMemo(
    () => ({ mostrarErro, fecharErro }),
    [mostrarErro, fecharErro],
  );

  return (
    <ErroModalContext.Provider value={value}>
      {children}
      <ErroModal key={erro?.id} erro={erro} onFechar={fecharErro} />
    </ErroModalContext.Provider>
  );
}
