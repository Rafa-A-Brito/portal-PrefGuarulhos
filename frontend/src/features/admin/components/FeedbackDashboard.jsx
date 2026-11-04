import { Component, lazy, Suspense } from "react";
import { dataBr, graficoSeguro, quantidadeFeedback, TIPOS } from "../feedbackDashboard";
import styles from "../pages/AdminFeedback.module.css";
const Graficos = lazy(() => import("./FeedbackGraficos"));
class GraficoDisponivel extends Component {
  state = { falhou: false };
  static getDerivedStateFromError() { return { falhou: true }; }
  render() { return this.state.falhou ? <p>Gráfico indisponível. Consulte os valores exatos na tabela.</p> : this.props.children; }
}
function Serie({ titulo, itens, temporal = false, vazio }) {
  const seguro = graficoSeguro(itens);
  return <section className={styles.serie} aria-label={titulo}><h3>{titulo}</h3>
    {!seguro && <p>Valores acima da precisão segura do gráfico. Consulte a tabela sem arredondamento.</p>}
    {seguro && !vazio && <GraficoDisponivel><Suspense fallback={<p role="status">Carregando gráfico…</p>}><Graficos itens={itens} temporal={temporal} /></Suspense></GraficoDisponivel>}
    <div className={styles.rolagem} tabIndex={0} role="region" aria-label={`Tabela: ${titulo}`}>
      <table className="admin-table"><caption>{titulo} — valores exatos</caption>
        <thead><tr><th scope="col">{temporal ? "Período" : "Tipo"}</th><th scope="col">Feedbacks</th></tr></thead>
        <tbody>{itens.map(i => <tr key={i.rotulo}><th scope="row">{i.rotulo}</th><td>{quantidadeFeedback(i.quantidade)}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
export default function FeedbackDashboard({ dados }) {
  return <section aria-labelledby="feedback-resumo"><h2 id="feedback-resumo">Feedbacks retidos no período</h2>
    <p className={styles.total}>Total: <strong>{quantidadeFeedback(dados.total)}</strong></p>
    <p>Contribuições recebidas e ainda retidas. Não representam visitantes únicos, satisfação populacional ou participação total do público.</p>
    {dados.total === "0" && <p role="status">Nenhum feedback retido no recorte selecionado.</p>}
    {dados.meta.recorteLimitadoPorRetencao && <p>Período limitado pela retenção de {dados.meta.retencaoDias} dias; registros já expirados não entram nos totais.</p>}
    <div className={styles.graficos}>
      <Serie titulo="Distribuição por tipo" itens={dados.porTipo.map(t => ({ ...t, rotulo: TIPOS[t.tipo] }))} vazio={dados.total === "0"} />
      <Serie titulo="Evolução temporal" temporal itens={dados.serie.map(p => ({ ...p, rotulo: `${dataBr(p.periodo)}${p.parcial ? " (parcial)" : ""}` }))} vazio={dados.total === "0"} />
    </div>
    <p className={styles.nota}>Períodos parciais seguem a indicação do servidor: dia atual, limites do recorte ou da retenção.</p>
  </section>;
}
