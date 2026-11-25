import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { formatarTituloPagina, tituloDaRota } from "../utils/tituloPagina";

export function useOrientacaoPagina(aguardando = false) {
  const { pathname, hash } = useLocation();
  const anterior = useRef(pathname);
  const pendente = useRef(false);

  useLayoutEffect(() => {
    const titulo = tituloDaRota(pathname);
    document.title = formatarTituloPagina(aguardando ? `Carregando ${titulo || "página"}` : titulo);
  }, [pathname, aguardando]);

  useEffect(() => {
    if (anterior.current !== pathname) {
      anterior.current = pathname;
      pendente.current = true;
    }
    // A primeira carga conserva o foco nativo. Query e hash não são outra página.
    if (!pendente.current || aguardando) return;
    pendente.current = false;
    if (hash) return; // A página conserva a gestão de seus links de âncora.

    const frame = requestAnimationFrame(() => {
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"]')) return;
      const conteudo = document.querySelector("main, .admin-login-shell");
      if (!conteudo) return;
      const ativo = document.activeElement;
      // Autofoco/validação de formulário tem prioridade sobre orientação da rota.
      if (conteudo.contains(ativo) && ativo?.matches('input, select, textarea, button, [contenteditable="true"]')) return;
      const alvo = conteudo.querySelector("h1") || conteudo;
      const temporario = !alvo.hasAttribute("tabindex");
      if (temporario) alvo.setAttribute("tabindex", "-1");
      alvo.setAttribute("data-foco-pagina", "");
      alvo.focus({ preventScroll: true });
      alvo.addEventListener("blur", () => {
        if (temporario) alvo.removeAttribute("tabindex");
        alvo.removeAttribute("data-foco-pagina");
      }, { once: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, aguardando]);
}
