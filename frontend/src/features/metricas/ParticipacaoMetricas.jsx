import { useSyncExternalStore } from "react";
import { participacao, metricasHabilitadas } from "./participacaoStore";
import "./coletaMetricas"; // Observa revogação mesmo fora de uma ficha.
import styles from "./ParticipacaoMetricas.module.css";

export default function ParticipacaoMetricas() {
  const escolha = useSyncExternalStore(participacao.assinar, participacao.obter);
  const habilitada = metricasHabilitadas();
  if (!habilitada && escolha !== "aceita") return null;
  const mensagens = {
    pendente: "Você ainda não escolheu participar. Nenhuma visualização é enviada.",
    aceita: "Participação aceita. Você pode interrompê-la a qualquer momento.",
    recusada: "Participação recusada ou revogada. Nenhuma nova visualização será enviada.",
    gpc: "Seu navegador sinaliza uma preferência de privacidade (GPC). A coleta está desativada para você.",
  };
  return (
    <details className={styles.painel}>
      <summary>Métricas opcionais de visita</summary>
      <p>Se você aceitar, podemos registrar a visita a uma ficha após dois segundos com a aba visível.
        Um cookie diário ajuda a evitar repetições no mesmo patrimônio. Não é necessário criar conta.</p>
      <p>A escolha não altera a navegação nem seus favoritos locais. Ao revogar, novos envios param;
        contagens já agregadas permanecem. O cookie expira ao fim do dia de São Paulo.</p>
      <p role="status" aria-live="polite">{mensagens[escolha]}</p>
      {!habilitada && <p>A coleta está indisponível nesta versão.</p>}
      <div className={styles.acoes}>
        <button type="button" disabled={!habilitada || escolha === "gpc" || escolha === "aceita"}
          onClick={() => participacao.escolher("aceita")}>Aceitar participação</button>
        <button type="button" onClick={() => participacao.escolher("recusada")}>
          {escolha === "aceita" ? "Revogar participação" : "Recusar participação"}
        </button>
      </div>
      <p className={styles.nota}>A preferência fica neste navegador. Se o armazenamento estiver bloqueado,
        a escolha dura somente nesta página e será solicitada novamente em outra visita.</p>
    </details>
  );
}
