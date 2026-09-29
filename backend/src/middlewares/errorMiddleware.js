// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, next) {
  console.error("[API Error]", err);
  res.status(500).json({ erro: "Erro interno do servidor." });
}
