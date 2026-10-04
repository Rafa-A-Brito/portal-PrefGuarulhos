import { Component } from "react";
import ErroModal from "./ErroModal";
import { normalizarErro } from "../../utils/erros";

/**
 * Rede de segurança do React: se qualquer componente quebrar na hora de
 * renderizar, em vez de uma tela branca o usuário vê o mesmo modal de erro
 * (com código e referência para o print) e um botão para voltar ao início.
 */
export default class ErrorBoundary extends Component {
  state = { erro: null };

  static getDerivedStateFromError(err) {
    return {
      erro: normalizarErro(err, {
        origem: "Renderização (React)",
        mensagem: "A tela não conseguiu ser exibida.",
      }),
    };
  }

  componentDidCatch(err, info) {
    console.error(
      `[${this.state.erro?.codigo}] Falha de renderização`,
      err,
      info?.componentStack,
    );
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="erro-boundary">
        <ErroModal
          erro={this.state.erro}
          rotuloFechar="Voltar ao início"
          onFechar={() => window.location.assign("/")}
        />
      </div>
    );
  }
}
