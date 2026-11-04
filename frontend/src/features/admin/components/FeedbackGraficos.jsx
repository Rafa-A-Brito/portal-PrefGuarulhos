import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { quantidadeFeedback } from "../feedbackDashboard";

export default function FeedbackGraficos({ itens, temporal = false }) {
  const Grafico = temporal ? LineChart : BarChart;
  const pontos = itens.map(i => ({ ...i, valor: Number(i.quantidade) }));
  return <div style={{ height: 260, minWidth: 0 }} aria-label={temporal ? "Gráfico de evolução temporal" : "Gráfico de distribuição por tipo"} role="img">
    <ResponsiveContainer width="100%" height="100%">
      <Grafico data={pontos} margin={{ top: 12, right: 12, left: 0, bottom: 12 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="rotulo" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} width={55} />
        <Tooltip formatter={(_valor, _nome, p) => [quantidadeFeedback(p.payload.quantidade), "Feedbacks"]} />
        {temporal ? <Line type="linear" dataKey="valor" stroke="#2b255c" strokeWidth={2} dot={false} isAnimationActive={false} />
          : <Bar dataKey="valor" fill="#2b255c" isAnimationActive={false} />}
      </Grafico>
    </ResponsiveContainer>
  </div>;
}
