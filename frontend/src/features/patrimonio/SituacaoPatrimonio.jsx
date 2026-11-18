import { obterSituacaoVisual } from "./situacao";
import "./SituacaoPatrimonio.css";

export default function SituacaoPatrimonio({ situacao }) {
  const visual = obterSituacaoVisual(situacao);
  if (!visual) return null;
  return (
    <span className={`situacao-selo situacao-selo--${visual.estilo}`} title={`Conservação: ${visual.rotulo}`}>
      {visual.rotulo}
    </span>
  );
}
