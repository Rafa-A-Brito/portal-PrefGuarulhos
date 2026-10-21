/**
 * Feedback local e aproximado de força. Não substitui verificações no backend,
 * bloqueio de senhas comprometidas ou uma estimativa de entropia real.
 * Mantém exatamente os limites aceitos pelo schema do backend (12 caracteres,
 * no máximo 72 bytes UTF-8). Não registra ou envia senhas para serviços externos.
 */
export function avaliarForcaSenha(senha) {
  const caracteres = Array.from(senha).length;
  const bytes = new TextEncoder().encode(senha).length;
  const atendeLimites = caracteres >= 12 && bytes <= 72;
  if (!senha) return { nivel: "vazia", rotulo: "", pontuacao: 0, caracteres, bytes, atendeLimites, dica: "Prefira uma senha longa e difícil de prever." };

  const classes = [/[a-z]/.test(senha), /[A-Z]/.test(senha), /\d/.test(senha), /[^\p{L}\p{N}\s]/u.test(senha)].filter(Boolean).length;
  let nota = (caracteres >= 12 ? 1 : 0) + (caracteres >= 16 ? 1 : 0) + (caracteres >= 20 ? 1 : 0);
  nota += Math.max(0, classes - 1);
  if (/(?:senha|password|admin|qwerty|abcd|1234|0123|2026)/i.test(senha)) nota -= 2;
  if (/(.)\1{3,}/u.test(senha)) nota -= 2;
  if (new Set(Array.from(senha)).size <= 3) nota -= 2;

  const nivel = !atendeLimites || nota < 3 ? "fraca" : nota < 5 ? "media" : "forte";
  const rotulo = { fraca: "Fraca", media: "Média", forte: "Forte" }[nivel];
  const pontuacao = { fraca: 1, media: 2, forte: 3 }[nivel];
  const dica = bytes > 72 ? "A senha ultrapassa 72 bytes em UTF-8." : caracteres < 12
    ? "Use pelo menos 12 caracteres."
    : nivel === "fraca" ? "Evite sequências previsíveis e repetições; prefira uma frase-senha longa."
    : nivel === "media" ? "Uma senha mais longa e menos previsível pode aumentar a segurança."
    : "Boa variedade e comprimento. Evite reutilizar senhas.";
  return { nivel, rotulo, pontuacao, caracteres, bytes, atendeLimites, dica };
}
