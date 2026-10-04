import { useContext } from "react";
import { ErroModalContext } from "../context/erroModalContextInstance";

/**
 * const { mostrarErro } = useErroModal();
 * mostrarErro(err, { origem: "AdminUsuarios › salvar", mensagem: "..." });
 */
export function useErroModal() {
  const contexto = useContext(ErroModalContext);

  if (!contexto) {
    throw new Error(
      "useErroModal precisa estar dentro de <ErroModalProvider>.",
    );
  }

  return contexto;
}
