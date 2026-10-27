import { Component, lazy, Suspense, useId, useState } from "react";
import styles from "./MetricasDashboard.module.css";

class LimiteMetricas extends Component {
  state = { erro: false };
  static getDerivedStateFromError() { return { erro: true }; }
  render() {
    return this.state.erro ? <div role="alert"><p>Não foi possível carregar a seção de visualizações.</p>
      <button type="button" onClick={this.props.repetir}>Tentar carregar seção novamente</button></div> : this.props.children;
  }
}
export default function SecaoMetricas() {
  const id = useId();
  const [aberta, setAberta] = useState(false);
  const [modulo, setModulo] = useState(() => ({ Conteudo: lazy(() => import("./MetricasDashboard")), versao: 0 }));
  const { Conteudo, versao } = modulo;
  return <section className={styles.secao} aria-label="Visualizações qualificadas V2">
    <h2>Visualizações qualificadas · V2</h2>
    <p>Registros de participação opcional, separados dos indicadores do acervo.</p>
    <button type="button" aria-expanded={aberta} aria-controls={id} onClick={() => setAberta(v => !v)}>
      {aberta ? "Recolher visualizações" : "Consultar visualizações"}
    </button>
    <div id={id}>{aberta && <LimiteMetricas key={versao} repetir={() => setModulo({ Conteudo: lazy(() => import("./MetricasDashboard")), versao: versao + 1 })}>
      <Suspense fallback={<p role="status">Carregando seção de visualizações…</p>}><Conteudo /></Suspense>
    </LimiteMetricas>}</div>
  </section>;
}
