import { useEffect, useState } from "react";
import { extrairMensagemDeErro } from "../services/adminApi";

export function useConteudoPublico(listar) {
  const [estado, setEstado] = useState({ itens: [], carregando: true, erro: null });
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    listar().then(
      (itens) => { if (ativo) setEstado({ itens, carregando: false, erro: null }); },
      (error) => { if (ativo) setEstado({ itens: [], carregando: false, erro: extrairMensagemDeErro(error) }); },
    );
    return () => { ativo = false; };
  }, [listar, tentativa]);
  function tentarNovamente() {
    setEstado({ itens: [], carregando: true, erro: null });
    setTentativa((n) => n + 1);
  }
  return { ...estado, tentarNovamente };
}
