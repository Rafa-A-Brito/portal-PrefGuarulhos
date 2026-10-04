import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { CATEGORIA_META, CATEGORIAS_ORDEM } from "../categoriaMeta";

export default function FiltroBar({ ativo, onChange }) {
  return (
    <div
      className="filterbar"
      role="group"
      aria-label="Filtrar patrimônios por categoria"
    >
      <span className="label">Filtrar por:</span>

      <button
        className={`filter-pill ${ativo === "todos" ? "on" : ""}`}
        onClick={() => onChange("todos")}
        aria-pressed={ativo === "todos"}
      >
        <Squares2X2Icon className="pill-icon" aria-hidden="true" />
        Todos
      </button>

      {CATEGORIAS_ORDEM.map((valor) => {
        const { label, Icon } = CATEGORIA_META[valor];
        return (
          <button
            key={valor}
            className={`filter-pill ${ativo === valor ? "on" : ""}`}
            onClick={() => onChange(valor)}
            aria-pressed={ativo === valor}
          >
            <Icon className="pill-icon" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// export function FiltroBar({ ativo, onChange }) {
//   return (
//     <div
//       className="filterbar"
//       role="group"
//       aria-label="Filtrar patrimônios por categoria"
//     >
//       <span className="label">Filtrar por:</span>

//       <button
//         className={`filter-pill ${ativo === "todos" ? "on" : ""}`}
//         onClick={() => onChange("todos")}
//         aria-pressed={ativo === "todos"}
//       >
//         <Squares2X2Icon className="pill-icon" aria-hidden="true" />
//         Todos
//       </button>

//       {CATEGORIAS_ORDEM.map((valor) => {
//         const { label, Icon } = CATEGORIA_META[valor];
//         return (
//           <button
//             key={valor}
//             className={`filter-pill ${ativo === valor ? "on" : ""}`}
//             onClick={() => onChange(valor)}
//             aria-pressed={ativo === valor}
//           >
//             <Icon className="pill-icon" aria-hidden="true" />
//             {label}
//           </button>
//         );
//       })}
//     </div>
//   );
// }
