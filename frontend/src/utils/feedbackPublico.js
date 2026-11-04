export const AVISO_FEEDBACK = "feedback-v1";
export const LIMITE_COMENTARIO = 2000;
export const LIMITE_CORPO = 16 * 1024;
export const JANELA_FEEDBACK = 24 * 60 * 60 * 1000;
export const TIPOS_FEEDBACK = [
  { valor: "ELOGIO", rotulo: "Elogio" },
  { valor: "SUGESTAO", rotulo: "Sugestão" },
  { valor: "PROBLEMA", rotulo: "Problema de uso" },
];
export const feedbackAtivo = () => import.meta.env.VITE_FEEDBACK_ATIVO === "true";
// Mesma ordem de operações da F2, inclusive trim antes da validação de controles.
export const normalizarComentario = texto => texto.replace(/\r\n/g, "\n").normalize("NFC").trim();
export const contarComentario = texto => [...normalizarComentario(texto)].length;
export const tamanhoCorpo = corpo => new TextEncoder().encode(corpo).byteLength;
export function prepararFeedback(tipo, mensagem) {
  const normalizada = normalizarComentario(mensagem), pontos = [...normalizada], erros = {};
  if (!TIPOS_FEEDBACK.some(t => t.valor === tipo)) erros.tipo = "Escolha um tipo de feedback.";
  if (!pontos.length) erros.mensagem = "Escreva um comentário.";
  else if (pontos.length > LIMITE_COMENTARIO) erros.mensagem = "Use até 2.000 caracteres após a normalização.";
  else if (pontos.some(c => {
    const n = c.codePointAt(0);
    return (n < 32 && n !== 10 && n !== 9) || (n >= 127 && n <= 159) || (n >= 0xd800 && n <= 0xdfff);
  })) erros.mensagem = "O comentário contém caracteres incompatíveis. Remova-os antes de enviar.";
  const payload = Object.freeze({ tipo, mensagem: normalizada, avisoVersao: AVISO_FEEDBACK });
  const corpo = JSON.stringify(payload);
  if (tamanhoCorpo(corpo) > LIMITE_CORPO) erros.mensagem = "O comentário excede o limite de transporte. Reduza o texto antes de enviar.";
  return { payload, corpo, erros };
}
export function envioExpirou(envio, agora = Date.now(), monotono = performance.now()) {
  return agora - envio.iniciadoEm >= JANELA_FEEDBACK || monotono - envio.inicioMonotono >= JANELA_FEEDBACK;
}
