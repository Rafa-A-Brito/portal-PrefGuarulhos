import { BarChart, Bar, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { quantidadeFeedback } from "../feedbackDashboard";

const EIXO = { fontSize: 11, fill: "#525d70" };
const curto = rotulo => /^\d{2}\/\d{2}\/\d{4}/.test(rotulo) ? rotulo.slice(0, 5) : rotulo;

// Tooltip sem animação, com o rótulo completo e a quantidade exata.
const dica = (cursor) => <Tooltip isAnimationActive={false} offset={12} cursor={cursor} allowEscapeViewBox={{ x: false, y: false }}
  wrapperStyle={{ zIndex: 10, pointerEvents: "none" }} contentStyle={{ border: "1px solid #dce1eb", borderRadius: 8, fontSize: 12 }}
  formatter={(_valor, _nome, p) => [quantidadeFeedback(p.payload.quantidade), "Feedbacks"]} />;

export default function FeedbackGraficos({ itens, temporal = false, compacto = false }) {
  const pontos = itens.map(i => ({ ...i, valor: Number(i.quantidade) }));
  const altura = compacto ? (temporal ? 170 : 150) : 260;
  return <div style={{ height: altura, minWidth: 0 }} aria-label={temporal ? "Gráfico de evolução temporal" : "Gráfico de distribuição por tipo"} role="img">
    <ResponsiveContainer width="100%" height="100%">
      {temporal
        ? <AreaChart data={pontos} margin={{ top: 8, right: 22, left: 0, bottom: 4 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="#e8ebf1" />
          <XAxis dataKey="rotulo" tick={EIXO} tickFormatter={curto} interval="preserveStartEnd" minTickGap={28} tickLine={false} />
          <YAxis allowDecimals={false} width={compacto ? 34 : 44} tick={EIXO} axisLine={false} tickLine={false} />
          {dica({ stroke: "#c5cad6" })}
          <Area type="linear" dataKey="valor" stroke="#2b255c" strokeWidth={2} fill="#2b255c" fillOpacity={0.08} dot={false} isAnimationActive={false} />
        </AreaChart>
        : compacto
          ? <BarChart data={pontos} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
            <CartesianGrid horizontal={false} stroke="#e8ebf1" />
            <XAxis type="number" allowDecimals={false} tick={EIXO} tickLine={false} />
            <YAxis type="category" dataKey="rotulo" width={76} tick={EIXO} axisLine={false} tickLine={false} />
            {dica({ fill: "#f0edf8" })}
            <Bar dataKey="valor" barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {pontos.map(p => <Cell key={p.rotulo} fill={p.cor ?? "#2b255c"} />)}
            </Bar>
          </BarChart>
          : <BarChart data={pontos} margin={{ top: 12, right: 12, left: 0, bottom: 4 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="#e8ebf1" />
            <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} />
            <YAxis allowDecimals={false} width={44} tick={EIXO} axisLine={false} tickLine={false} />
            {dica({ fill: "#f0edf8" })}
            <Bar dataKey="valor" barSize={56} radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {pontos.map(p => <Cell key={p.rotulo} fill={p.cor ?? "#2b255c"} />)}
            </Bar>
          </BarChart>}
    </ResponsiveContainer>
  </div>;
}
