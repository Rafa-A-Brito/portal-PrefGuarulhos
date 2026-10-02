import { createContext } from "react";

// Só o objeto de contexto do modal de erro — separado do Provider
// (ErroModalContext.jsx) e do hook (useErroModal.js), no mesmo padrão do
// AuthContext e do PatrimoniosContext (react-refresh/only-export-components).
export const ErroModalContext = createContext(null);
