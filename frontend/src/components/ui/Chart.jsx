// shadcn/ui Chart (MIT): composição/configuração e tooltip adaptados para JSX,
// CSS Modules e apenas os recursos usados neste portal. Ver LICENSE nesta pasta.
// https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/chart.tsx
import { createContext, useContext, useId } from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import styles from "./ui.module.css";

const ChartContext = createContext(null);
const INITIAL_DIMENSION = { width: 320, height: 280 };

export function ChartContainer({ config, children, className = "", ...props }) {
  const id = useId();
  return (
    <ChartContext.Provider value={config}>
      <div data-slot="chart" data-chart={id} className={`${styles.chart} ${className}`}
        style={Object.fromEntries(Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color]))}
        {...props}>
        <ResponsiveContainer initialDimension={INITIAL_DIMENSION} minWidth={0}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip(props) {
  return <Tooltip {...props} />;
}

export function ChartTooltipContent({ active, payload, label }) {
  const config = useContext(ChartContext);
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      {label != null && <strong>{label}</strong>}
      {payload.filter(item => item.type !== "none").map((item, index) => (
        <div key={`${item.dataKey}-${index}`}>
          <span>{item.payload?.nome ?? config?.[item.dataKey]?.label ?? item.name}</span>
          <strong>{Number(item.value).toLocaleString("pt-BR")}</strong>
        </div>
      ))}
    </div>
  );
}
