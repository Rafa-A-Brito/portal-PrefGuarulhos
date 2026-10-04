import { useContext } from "react";
import { PatrimoniosContext } from "../context/patrimoniosContextInstance";

export function usePatrimoniosContext() {
  const ctx = useContext(PatrimoniosContext);
  if (!ctx) {
    throw new Error(
      "usePatrimoniosContext deve ser usado dentro de <PatrimoniosProvider>",
    );
  }
  return ctx;
}
