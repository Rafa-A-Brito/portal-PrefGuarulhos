import { Component, lazy, Suspense } from "react";
import { dataBr, graficoSeguro, quantidadeFeedback, TIPOS } from "../feedbackDashboard";
import styles from "../pages/AdminFeedback.module.css";
const Graficos = lazy(() => import("./FeedbackGraficos"));

// Cores por tipo, coerentes com a paleta dos gráficos da Dashboard (verde, azul e âmbar).
const CORES = { ELOGIO: "#237568", SUGESTAO: "#3f69a6", PROBLEMA: "#af7016" };
const PLURAIS = { ELOGIO: "Elogios", SUGESTAO: "Sugestões", PROBLEMA: "Problemas de uso" };

class GraficoDisponivel extends Component {
  state = { falhou: false };
  static getDerivedStateFromError() { return { falhou: true }; }
  render() { return this.state.falhou ? <p>Gráfico indisponível. Consulte os valores exatos na tabela.</p> : this.props.children; }
}
function Serie({ titulo, itens, temporal = false, vazio, compacto }) {
  const seguro = graficoSeguro(itens);
  const tabela = <div className={styles.rolagem} tabIndex={0} role="region" aria-label={`Tabela: ${titulo}`}>
    <table className="admin-table"><caption>{titulo} — valores exatos</caption>
      <thead><tr><th scope="col">{temporal ? "Período" : "Tipo"}</th><th scope="col">Feedbacks</th></tr></thead>
      <tbody>{itens.map(i => <tr key={i.rotulo}><th scope="row">{i.rotulo}</th><td>{quantidadeFeedback(i.quantidade)}</td></tr>)}</tbody>
    </table>
  </div>;
  return <section className={styles.serie} aria-label={titulo}><h3>{titulo}</h3>
    {!seguro && <p>Valores acima da precisão segura do gráfico. Consulte a tabela sem arredondamento.</p>}
    {seguro && !vazio && <GraficoDisponivel><Suspense fallback={<p role="status">Carregando gráfico…</p>}><Graficos itens={itens} temporal={temporal} compacto={compacto} /></Suspense></GraficoDisponivel>}
    {compacto ? <details className={styles.valores} open={!seguro}><summary>Ver valores exatos</summary>{tabela}</details> : tabela}
  </section>;
}
export default function FeedbackDashboard({ dados, compacto = false }) {
  const Titulo = compacto ? "h3" : "h2";
  const porTipo = dados.porTipo.map(t => ({ ...t, rotulo: TIPOS[t.tipo], cor: CORES[t.tipo] }));
  return <section aria-labelledby="feedback-resumo" className={compacto ? styles.resumoCompacto : undefined}>
    <Titulo id="feedback-resumo" className={compacto ? styles.tituloResumo : undefined}>Feedbacks retidos no período</Titulo>
    <dl className={styles.kpis}>
      <div className={styles.kpi} data-tipo="TOTAL"><dt>Total</dt><dd>{quantidadeFeedback(dados.total)}</dd></div>
      {porTipo.map(t => <div key={t.tipo} className={styles.kpi} data-tipo={t.tipo}><dt><i aria-hidden="true" />{PLURAIS[t.tipo]}</dt><dd>{quantidadeFeedback(t.quantidade)}</dd></div>)}
    </dl>
    <p className={styles.nota}>Contribuições recebidas e ainda retidas. Não representam visitantes únicos, satisfação populacional ou participação total do público.</p>
    {dados.total === "0" && <p role="status">Nenhum feedback retido no recorte selecionado.</p>}
    {dados.meta.recorteLimitadoPorRetencao && <p className={styles.nota}>Período limitado pela retenção de {dados.meta.retencaoDias} dias; registros já expirados não entram nos totais.</p>}
    <div className={compacto ? styles.graficosCompactos : styles.graficos}>
      <Serie titulo="Distribuição por tipo" itens={porTipo} vazio={dados.total === "0"} compacto={compacto} />
      <Serie titulo="Evolução temporal" temporal itens={dados.serie.map(p => ({ ...p, rotulo: `${dataBr(p.periodo)}${p.parcial ? " (parcial)" : ""}` }))} vazio={dados.total === "0"} compacto={compacto} />
    </div>
    <p className={styles.nota}>Períodos parciais seguem a indicação do servidor: dia atual, limites do recorte ou da retenção.</p>
  </section>;
}
