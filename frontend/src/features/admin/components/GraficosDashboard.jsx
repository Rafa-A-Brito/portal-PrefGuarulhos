import { useId } from "react";
import { PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../../../components/ui/Chart";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import styles from "../pages/AdminDashboard.module.css";

const situacoes = {
  PRESERVADO: ["Preservado", "#237568"], DEMOLIDO: ["Demolido", "#9b4359"],
  EM_RESTAURACAO: ["Em restauração", "#3f69a6"], NECESSITA_RESTAURACAO: ["Necessita restauração", "#af7016"],
  EM_RUINAS: ["Em ruínas", "#8358a0"], NAO_INFORMADO: ["Não informado", "#697386"],
};
const publicacoes = {
  PUBLICADO: ["Publicado", "#3f69a6"], RASCUNHO: ["Rascunho", "#af7016"], ARQUIVADO: ["Arquivado", "#697386"],
};
const config = { quantidade: { label: "Patrimônios", color: "#6554a4" } };
const formatar = valor => valor.toLocaleString("pt-BR");

function RotuloRegiao({ x, y, payload }) {
  const linhas = [];
  for (const palavra of String(payload.value).split(" ")) {
    const ultima = linhas.length - 1;
    if (ultima >= 0 && (linhas[ultima] + " " + palavra).length <= 14) linhas[ultima] += " " + palavra;
    else linhas.push(palavra);
  }
  return <text x={x} y={y} textAnchor="middle" fill="#525d70" fontSize={10}>
    {linhas.map((linha, i) => <tspan key={i} x={x} dy={i ? 12 : 0}>{linha}</tspan>)}
  </text>;
}

function Legenda({ dados, titulo }) {
  return <ul className={styles.legend} aria-label={`Quantidades: ${titulo}`}>
    {dados.map(item => <li key={item.nome}>
      <span><i aria-hidden="true" style={{ background: item.fill ?? config.quantidade.color }} />{item.nome}</span>
      <strong>{formatar(item.quantidade)}</strong>
    </li>)}
  </ul>;
}

function Painel({ titulo, descricao, children }) {
  const id = useId();
  return <Card aria-labelledby={id}>
    <CardHeader><CardTitle id={id}>{titulo}</CardTitle><CardDescription>{descricao}</CardDescription></CardHeader>
    <CardContent>{children}</CardContent>
  </Card>;
}

function Donut({ titulo, descricao, dados, total }) {
  return <Painel titulo={titulo} descricao={descricao}>
    <div className={styles.donut}>
      <ChartContainer config={config} aria-label={titulo}>
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie data={dados} dataKey="quantidade" nameKey="nome" innerRadius="65%" outerRadius="90%" strokeWidth={3} isAnimationActive={false}>
            {dados.map(item => <Cell key={item.nome} fill={item.fill} />)}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className={styles.donutTotal} aria-hidden="true"><strong>{formatar(total)}</strong><span>patrimônios</span></div>
    </div>
    <Legenda dados={dados} titulo={titulo} />
    <p className={styles.total}>Total representado: {formatar(total)}</p>
  </Painel>;
}

export default function GraficosDashboard({ dados }) {
  const conservacao = dados.porSituacao.map(item => ({ ...item,
    nome: situacoes[item.situacao]?.[0] ?? item.situacao, fill: situacoes[item.situacao]?.[1] ?? "#697386" }));
  const status = Object.entries(publicacoes).map(([key, [nome, fill]]) => ({ nome, fill, quantidade: dados[key] }));
  const comRegiao = dados.porRegiao.reduce((soma, item) => soma + item.quantidade, 0);
  return <div className={styles.charts}>
    <Donut titulo="Situação de conservação" descricao="Classificação cadastrada do bem, em todos os status." dados={conservacao} total={dados.total} />
    <Painel titulo="Distribuição por região" descricao="Regiões editoriais do patrimônio. Bairro não entra nesta distribuição.">
      {comRegiao > 0 ? <ChartContainer config={config} aria-label="Distribuição por região">
        <RadarChart data={dados.porRegiao} outerRadius="65%" accessibilityLayer>
          <PolarGrid stroke="#dce1eb" /><PolarAngleAxis dataKey="nome" tick={<RotuloRegiao />} />
          <PolarRadiusAxis allowDecimals={false} domain={[0, Math.max(1, ...dados.porRegiao.map(r => r.quantidade))]} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar name="Patrimônios" dataKey="quantidade" fill="var(--color-quantidade)" stroke="var(--color-quantidade)" fillOpacity={0.25} isAnimationActive={false} />
        </RadarChart>
      </ChartContainer> : <p className={styles.empty}>Nenhum patrimônio com região atribuída.</p>}
      <Legenda dados={dados.porRegiao} titulo="Distribuição por região" />
      <p className={styles.regionNote}><strong>{formatar(dados.semRegiao)} sem região atribuída</strong><span>Contados no acervo, fora dos eixos do radar.</span></p>
      <p className={styles.total}>{formatar(comRegiao)} com região + {formatar(dados.semRegiao)} sem região = {formatar(dados.total)} patrimônios</p>
    </Painel>
    <Painel titulo="Categorias principais" descricao="Cada patrimônio é contado uma única vez nas barras, inclusive os arquivados.">
      <ChartContainer config={config} className={styles.bars} aria-label="Categorias principais">
        <BarChart data={dados.porCategoria} layout="vertical" margin={{ left: 0, right: 16 }} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="#e5e8ef" />
          <XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="nome" interval={0} width={100} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "#f0edf8" }} />
          <Bar dataKey="quantidade" name="Principal" fill="var(--color-quantidade)" radius={[0, 5, 5, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption>Quantidades por categoria — principal e secundária</caption>
          <thead><tr><th scope="col">Categoria</th><th scope="col">Principal</th><th scope="col">Secundária</th></tr></thead>
          <tbody>{dados.porCategoria.map(item => <tr key={item.id}><th scope="row">{item.nome}</th><td>{item.quantidade}</td><td>{item.quantidadeSecundaria}</td></tr>)}</tbody>
        </table>
      </div>
      <p className={styles.total}>Total de patrimônios: {formatar(dados.total)}. Vínculos secundários não são somados ao total.</p>
    </Painel>
    <Donut titulo="Status de publicação" descricao="Visibilidade editorial, independente da conservação." dados={status} total={dados.total} />
  </div>;
}
