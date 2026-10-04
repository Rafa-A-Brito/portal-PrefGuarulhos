import { createContext } from "react";

// Apenas o objeto de contexto — mantido num arquivo separado para que
// PatrimoniosContext.jsx (componente) e usePatrimoniosContext.js (hook)
// possam, cada um, exportar só um tipo de coisa. Isso evita o aviso do
// eslint-plugin-react-refresh (react-refresh/only-export-components),
// que exige que arquivos com componente exportem *apenas* componentes.
export const PatrimoniosContext = createContext(null);
