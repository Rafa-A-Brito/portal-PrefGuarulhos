import { ExclamationTriangleIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { formatarPrevisaoReabertura, restricaoVisitacao } from "../../features/visitacao";
import "./VisitacaoPatrimonio.css";

export default function VisitacaoPatrimonio({ item, aviso = false }) {
  const restricao = restricaoVisitacao(item.statusVisitacao);
  if (!restricao) return null;

  const Icone = item.statusVisitacao === "SEM_VISITACAO_PUBLICA" ? LockClosedIcon : ExclamationTriangleIcon;
  if (!aviso) {
    return <span className="visitacao-selo"><Icone aria-hidden="true" />{restricao.selo}</span>;
  }

  const previsao = formatarPrevisaoReabertura(item.previsaoReabertura);
  return (
    <div className="visitacao-aviso" role="note" aria-label="Visitação">
      <Icone aria-hidden="true" />
      <div>
        <strong>{restricao.aviso}</strong>
        {item.motivoRestricao && <p>{item.motivoRestricao}</p>}
        {previsao && <p>Previsão de reabertura: <time dateTime={item.previsaoReabertura}>{previsao}</time></p>}
      </div>
    </div>
  );
}
