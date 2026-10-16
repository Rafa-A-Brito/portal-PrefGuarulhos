import { useId, useState } from "react";
import {
  BookOpenIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  SparklesIcon,
  ClockIcon,
  UsersIcon,
  AcademicCapIcon,
  GlobeAmericasIcon,
  HeartIcon,
  MusicalNoteIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

// Ícone de cada seção, escolhido pelo campo `icone` em item.detalhes (ver mock).
const ICONES = {
  historia: BookOpenIcon,
  tempo: ClockIcon,
  arquitetura: BuildingLibraryIcon,
  importancia: BuildingLibraryIcon,
  gente: UsersIcon,
  ensino: AcademicCapIcon,
  natureza: GlobeAmericasIcon,
  tradicao: HeartIcon,
  fe: HeartIcon,
  musica: MusicalNoteIcon,
  processo: ScaleIcon,
  alerta: ExclamationTriangleIcon,
  hoje: SparklesIcon,
};

/**
 * Seções editoriais em barras expansíveis (disclosure).
 * - A primeira seção começa aberta; as demais, fechadas.
 * - Várias seções podem ficar abertas ao mesmo tempo.
 * - O estado aberto/fechado é só visual e local: não altera dados nem contrato.
 * - O painel fechado permanece no DOM para animar a altura. inert e
 *   aria-hidden o retiram imediatamente da interação e da acessibilidade.
 */
export default function SecoesAcordeao({ secoes }) {
  const base = useId();
  const [abertas, setAbertas] = useState(() => new Set([0]));

  const alternar = (indice) =>
    setAbertas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(indice)) proxima.delete(indice);
      else proxima.add(indice);
      return proxima;
    });

  return (
    <div className="acordeao">
      {secoes.map((secao, i) => {
        const SecaoIcon = ICONES[secao.icone] ?? BookOpenIcon;
        const aberta = abertas.has(i);
        const botaoId = `${base}-botao-${i}`;
        const painelId = `${base}-painel-${i}`;
        return (
          <div className="acordeao-item" data-aberta={aberta} key={i}>
            <h2 className="acordeao-titulo">
              <button
                type="button"
                id={botaoId}
                className="acordeao-gatilho"
                aria-expanded={aberta}
                aria-controls={painelId}
                onClick={() => alternar(i)}
              >
                <SecaoIcon className="acordeao-icone" width={20} height={20} aria-hidden="true" />
                <span className="acordeao-rotulo">{secao.titulo}</span>
                <ChevronRightIcon className="acordeao-chevron" width={20} height={20} aria-hidden="true" />
              </button>
            </h2>
            <div id={painelId} className="acordeao-painel" inert={!aberta} aria-hidden={!aberta}>
              <div className="acordeao-painel-miolo">
                <div className="acordeao-texto">
                  {secao.texto.split("\n\n").map((paragrafo, k) => (
                    <p key={k}>{paragrafo}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
