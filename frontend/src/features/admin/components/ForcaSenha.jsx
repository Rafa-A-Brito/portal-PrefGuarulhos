import { avaliarForcaSenha } from "../../../utils/forcaSenha.js";
import "./forca-senha.css";

/** Indicador informativo apenas para senhas novas (nunca para o login). */
export default function ForcaSenha({ senha, id }) {
  const avaliacao = avaliarForcaSenha(senha);
  return (
    <div id={id} className={`forca-senha forca-senha--${avaliacao.nivel}`}>
      <div className="forca-senha-topo">
        <span>Força da senha</span>
        <strong aria-live="polite">{avaliacao.rotulo || "Não avaliada"}</strong>
      </div>
      <div className="forca-senha-trilha" role="progressbar" aria-label="Força da senha"
        aria-valuemin={0} aria-valuemax={3} aria-valuenow={avaliacao.pontuacao}
        aria-valuetext={avaliacao.rotulo || "Não avaliada"}>
        <span className="forca-senha-barra" />
      </div>
      <p className="forca-senha-ajuda">{avaliacao.dica}</p>
      {senha && !avaliacao.atendeLimites && (
        <p className="forca-senha-limite">Permitido: de 12 caracteres a 72 bytes UTF-8.</p>
      )}
    </div>
  );
}
