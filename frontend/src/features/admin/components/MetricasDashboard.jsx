import { useEffect, useId, useRef, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../../../components/ui/Chart";
import { buscarMetricasDashboard, buscarPatrimoniosMetricas } from "../../../services/dashboardApi";
import { listarRegioesAdmin } from "../../../services/regioesApi";
import { diaPaulista, periodoInicial, validarPeriodo, validarMetricas, serieComLacunas, serieSegura,
  quantidadeExata, quantidadeGrafica, formatarDia } from "../metricasDashboard";
import styles from "./MetricasDashboard.module.css";

const config = { quantidade: { label: "Visualizações registradas", color: "#5269a8" } };
const regioes = (busca, signal) => listarRegioesAdmin({ ...(busca && { busca }), pagina: 1, limite: 20 }, signal);

function FiltroCadastro({ nome, valor, mudar, buscar, semRegiao = false }) {
  const id = useId(), controller = useRef();
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState({ itens: [], carregando: false, erro: "", buscou: false });
  useEffect(() => () => controller.current?.abort(), []);
  async function pesquisar() {
    controller.current?.abort();
    const atual = new AbortController(); controller.current = atual;
    setEstado(e => ({ ...e, carregando: true, erro: "" }));
    try {
      const result = await buscar(busca.trim(), atual.signal);
      if (atual.signal.aborted) return;
      setEstado(e => ({ itens: [...e.itens.filter(i => i.id === valor && !result.itens.some(n => n.id === valor)), ...result.itens],
        carregando: false, erro: "", buscou: true }));
    } catch {
      if (!atual.signal.aborted) setEstado(e => ({ ...e, carregando: false, erro: `Não foi possível buscar ${nome.toLowerCase()}. Tente novamente.` }));
    }
  }
  return <div className={styles.filtroCadastro}>
    <label htmlFor={`${id}-busca`}>Buscar {nome.toLowerCase()}</label>
    <div className={styles.busca}>
      <input id={`${id}-busca`} type="search" maxLength={100} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou parte do nome" />
      <button type="button" disabled={estado.carregando} onClick={pesquisar}>Buscar {nome.toLowerCase()}</button>
    </div>
    <label htmlFor={id}>{nome} (opcional)</label>
    <select id={id} value={valor} onChange={e => mudar(e.target.value)}>
      <option value="">Todos</option>
      {semRegiao && <option value="sem-regiao">Somente sem região</option>}
      {estado.itens.map(i => <option key={i.id} value={i.id}>{i.nome}{i.ativo === false ? " (inativa)" : i.status ? ` (${i.status})` : ""}</option>)}
    </select>
    <small>Até 20 opções por busca; refine o nome para encontrar outras.</small>
    {estado.carregando && <p role="status">Buscando opções…</p>}
    {estado.erro && <p role="alert">{estado.erro}</p>}
    {estado.buscou && estado.itens.length === 0 && <p>Nenhuma opção encontrada.</p>}
  </div>;
}

function Painel({ titulo, descricao, children }) {
  const id = useId();
  return <Card aria-labelledby={id}><CardHeader><CardTitle id={id}>{titulo}</CardTitle><CardDescription>{descricao}</CardDescription></CardHeader>
    <CardContent>{children}</CardContent></Card>;
}
function Tabela({ titulo, itens, temporal = false, hoje }) {
  return <div className={styles.tabelaWrap} tabIndex={0} role="region" aria-label={`Tabela: ${titulo}`}>
    <table><caption>{titulo} — valores exatos</caption><thead><tr><th scope="col">{temporal ? "Dia" : "Nome"}</th><th scope="col">Visualizações registradas</th></tr></thead>
      <tbody>{itens.map(i => <tr key={i.id ?? i.data}>
        <th scope="row">{temporal ? `${formatarDia(i.data)}${i.data === hoje ? " (parcial)" : ""}` : i.nome}
          {!temporal && i.status && <small> · {i.status}</small>}{i.ativo === false && <small> · região inativa</small>}</th>
        <td>{i.quantidade === null ? "Sem dado disponível" : quantidadeExata(i.quantidade)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
function TooltipMetricas({ temporal = false, ...props }) {
  const label = temporal && typeof props.label === "string" ? formatarDia(props.label) : undefined;
  return <div role="status" aria-live="polite" aria-atomic="true"><ChartTooltipContent {...props} label={label} /></div>;
}
function Cobertura({ meta }) {
  if (meta.cobertura !== "SONDAGEM_5_MIN") return <p>{meta.cobertura === "NAO_INSTRUMENTADA" ? "Cobertura não instrumentada: não é possível certificar dias completos ou interpretar ausência como zero visitas." : "Cobertura não reconhecida: consulte a equipe responsável antes de interpretar lacunas."}</p>;
  const o = meta.observacao, r = o.resumo;
  const nomes = { FORA_DA_RETENCAO: "Fora da retenção", DISPONIVEL_NAS_SONDAS: "Disponível nas sondas", SEM_OBSERVACAO: "Sem observação", PARCIAL: "Cobertura parcial" };
  return <div>
    <p>Cobertura por sondagem a cada cinco minutos. Não comprova entrega de todos os eventos nem audiência humana.</p>
    <p>Janelas encerradas: {r.esperadas}; disponíveis: {r.disponiveis}; coleta desativada: {r.desativadas}; falhas: {r.falhas}; sem observação: {r.desconhecidas}.</p>
    <p>Início da observação: {formatarDia(diaPaulista(new Date(o.inicioObservacao)))}. Início da coleta não certificado.</p>
    <p>{meta.inicioDisponivel ? `Retenção: dados anteriores a ${formatarDia(meta.inicioDisponivel)} indisponíveis.` : "Nenhum corte de retenção registrado."} Ausência de eventos não comprova zero visitantes.</p>
    <details><summary>Cobertura diária</summary>
      <div className={styles.tabelaWrap} tabIndex={0} role="region" aria-label="Tabela: cobertura diária"><table>
        <caption>Sondagens operacionais — janelas encerradas de cinco minutos</caption>
        <thead><tr>{["Dia", "Estado", "Esperadas", "Disponíveis", "Desativadas", "Falhas", "Sem observação"].map(n => <th key={n} scope="col">{n}</th>)}</tr></thead>
        <tbody>{o.porDia.map(d => <tr key={d.data}><th scope="row">{formatarDia(d.data)}{d.parcial ? " (parcial)" : ""}</th><td>{nomes[d.estado]}</td>
          {["esperadas", "disponiveis", "desativadas", "falhas", "desconhecidas"].map(k => <td key={k}>{d[k]}</td>)}</tr>)}</tbody>
      </table></div>
    </details>
  </div>;
}
function Grafico({ itens, titulo, temporal = false }) {
  if (!itens.length) return <p>Nenhum item registrado neste recorte.</p>;
  if (!serieSegura(itens)) return <p className={styles.aviso}>Gráfico não exibido: há valores acima do limite numérico seguro. Consulte a tabela exata.</p>;
  const data = itens.map(i => ({ ...i, quantidade: quantidadeGrafica(i.quantidade), rotulo: i.nome?.length > 22 ? i.nome.slice(0, 21) + "…" : i.nome }));
  return <ChartContainer config={config} aria-label={titulo} className={styles.grafico}>
    {temporal ? <LineChart data={data} accessibilityLayer margin={{ left: 8, right: 14, top: 12, bottom: 5 }}>
      <CartesianGrid stroke="#e5e8ef" /><XAxis dataKey="data" minTickGap={25} tickFormatter={v => formatarDia(v).slice(0, 5)} tick={{ fontSize: 11 }} />
      <YAxis allowDecimals={false} width={65} tick={{ fontSize: 10 }} />
      <ChartTooltip filterNull content={<TooltipMetricas temporal />} />
      <Line name="Visualizações registradas" type="linear" dataKey="quantidade" stroke="#5269a8" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
    </LineChart> : <BarChart data={data} layout="vertical" accessibilityLayer margin={{ right: 16 }}>
      <CartesianGrid horizontal={false} stroke="#e5e8ef" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
      <YAxis type="category" dataKey="rotulo" interval={0} width={120} tick={{ fontSize: 10 }} tickLine={false} />
      <ChartTooltip content={<TooltipMetricas />} />
      <Bar dataKey="quantidade" name="Visualizações registradas" fill="#5269a8" radius={[0, 4, 4, 0]} isAnimationActive={false} />
    </BarChart>}
  </ChartContainer>;
}

export default function MetricasDashboard() {
  const [form, setForm] = useState(() => ({ ...periodoInicial(), patrimonioId: "", regiao: "" }));
  const [consulta, setConsulta] = useState(() => ({ ...periodoInicial(), pagina: 1, limite: 10 }));
  const [tentativa, setTentativa] = useState(0);
  const [erroFiltro, setErroFiltro] = useState("");
  const [estado, setEstado] = useState({ carregando: true, dados: null, erro: "" });
  useEffect(() => {
    const controller = new AbortController();
    buscarMetricasDashboard(consulta, controller.signal).then(dados => {
      if (controller.signal.aborted) return;
      const validado = validarMetricas(dados);
      if (validado.disponivel && (validado.meta.inicio !== consulta.inicio || validado.meta.fim !== consulta.fim ||
        validado.visualizacoes.porPatrimonio.paginacao.pagina !== consulta.pagina)) throw new Error();
      setEstado({ carregando: false, dados: validado, erro: "" });
    }).catch(() => {
      if (!controller.signal.aborted) setEstado({ carregando: false, dados: null, erro: "Não foi possível consultar as visualizações. Nenhum total foi estimado." });
    });
    return () => controller.abort();
  }, [consulta, tentativa]);
  const carregar = nova => { setEstado({ carregando: true, dados: null, erro: "" }); setConsulta(nova); };
  function aplicar(e) {
    e.preventDefault();
    const erro = validarPeriodo(form); setErroFiltro(erro);
    if (erro) return;
    carregar({ inicio: form.inicio, fim: form.fim, pagina: 1, limite: 10,
      ...(form.patrimonioId && { patrimonioId: form.patrimonioId }),
      ...(form.regiao === "sem-regiao" ? { semRegiao: "true" } : form.regiao ? { regiaoId: form.regiao } : {}) });
  }
  const dados = estado.dados, v = dados?.visualizacoes;
  const hoje = dados?.meta ? diaPaulista(new Date(dados.meta.geradoEm)) : diaPaulista();
  const serie = dados?.disponivel ? serieComLacunas(dados) : [];
  const paginas = v ? Math.min(10000, Math.max(1, Math.ceil(v.porPatrimonio.paginacao.total / v.porPatrimonio.paginacao.limite))) : 1;
  return <div className={styles.conteudo}>
    <form onSubmit={aplicar} className={styles.formulario} aria-label="Filtros de visualizações">
      <div className={styles.datas}>
        <label>Data inicial<input type="date" required value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} /></label>
        <label>Data final<input type="date" required value={form.fim} onChange={e => setForm(f => ({ ...f, fim: e.target.value }))} /></label>
      </div>
      <p>Datas inclusivas, até 366 dias, no fuso America/Sao_Paulo. Série diária.</p>
      <p>Use “Aplicar filtros” após editar. “Atualizar visualizações” repete a consulta já aplicada.</p>
      <details className={styles.opcionais}><summary>Filtrar por patrimônio ou região</summary><div className={styles.filtros}>
        <FiltroCadastro nome="Patrimônio" valor={form.patrimonioId} mudar={patrimonioId => setForm(f => ({ ...f, patrimonioId }))} buscar={buscarPatrimoniosMetricas} />
        <FiltroCadastro nome="Região" valor={form.regiao} mudar={regiao => setForm(f => ({ ...f, regiao }))} buscar={regioes} semRegiao />
      </div></details>
      {erroFiltro && <p role="alert">{erroFiltro}</p>}
      <button type="submit" disabled={estado.carregando}>Aplicar filtros</button>{" "}
      <button type="button" disabled={estado.carregando} onClick={() => { setEstado({ carregando: true, dados: null, erro: "" }); setTentativa(t => t + 1); }}>Atualizar visualizações</button>
    </form>
    {estado.carregando && <p role="status">Carregando visualizações…</p>}
    {estado.erro && <p role="alert">{estado.erro} Use “Atualizar visualizações” para tentar novamente.</p>}
    {dados?.disponivel === false && <p role="status">Métricas ainda não habilitadas</p>}
    {dados?.disponivel && <>
      <div className={styles.indicadores}>
        <p>Total registrado no período e filtros: <strong>{quantidadeExata(v.totalRegistrado)}</strong></p>
        <p>Período consultado: <strong>{formatarDia(dados.meta.inicio)} a {formatarDia(dados.meta.fim)}</strong> (inclusivo).</p>
        <p>Unidade: uma visualização por credencial diária, patrimônio e dia. Não representa visitantes únicos.</p>
        <p>Região de referência: cadastro atual do patrimônio, não localização do visitante.</p>
        <Cobertura meta={dados.meta} />
        {dados.meta.inicio <= hoje && dados.meta.fim >= hoje && <p>Dia {formatarDia(hoje)} parcial na geração destes dados.</p>}
        {dados.favoritos?.disponivel === false && <p>Favoritos globais indisponíveis nesta fase.</p>}
      </div>
      {BigInt(v.totalRegistrado) === 0n ? <p role="status">Nenhum evento registrado neste período e filtros. Isso não comprova ausência de visitas.</p> : <div className={styles.grade}>
        <Painel titulo="Patrimônios mais visualizados" descricao="Ranking da página atual. O total do período inclui todas as páginas.">
          <Grafico titulo="Ranking de visualizações" itens={v.porPatrimonio.itens} />
          <Tabela titulo="Ranking desta página" itens={v.porPatrimonio.itens} />
          <p>{v.porPatrimonio.paginacao.total} patrimônios com registros · página {consulta.pagina} de {paginas}.</p>
          <nav className={styles.paginacao} aria-label="Paginação do ranking">
            <button type="button" disabled={consulta.pagina <= 1} onClick={() => carregar({ ...consulta, pagina: consulta.pagina - 1 })}>Página anterior</button>
            <button type="button" disabled={consulta.pagina >= paginas} onClick={() => carregar({ ...consulta, pagina: consulta.pagina + 1 })}>Próxima página</button>
          </nav>
        </Painel>
        <Painel titulo="Visualizações por dia" descricao="Lacunas representam dias sem dado disponível; não são preenchidas com zero. Use as setas no gráfico ou a tabela.">
          <Grafico titulo="Série diária de visualizações" itens={serie} temporal />
          <Tabela titulo="Série diária" itens={serie} temporal hoje={hoje} />
        </Painel>
        <Painel titulo="Visualizações por região" descricao="Usa a região atual do bem. Mudanças no cadastro redistribuem o histórico; regiões inativas continuam identificadas.">
          <Grafico titulo="Comparativo regional de visualizações" itens={v.porRegiao} />
          <Tabela titulo="Regiões cadastradas" itens={v.porRegiao} />
          <p className={styles.aviso}><strong>Sem região: {quantidadeExata(v.semRegiao)}</strong>. Incluído no total, separado das regiões cadastradas.</p>
        </Painel>
      </div>}
    </>}
  </div>;
}
