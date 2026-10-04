import { createContext } from "react";

// Só o objeto de contexto — separado do Provider (AuthContext.jsx) e do
// hook (useAuth.js) pelo mesmo motivo do PatrimoniosContext: eslint-plugin
// react-refresh exige que arquivo-com-componente exporte só componente.
export const AuthContext = createContext(null);