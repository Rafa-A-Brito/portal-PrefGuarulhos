import { useState } from "react";
import { normalizarUrlImagem } from "../utils/urlImagem";

const FALLBACK = "/imagem-indisponivel.svg";

export default function ImagemPatrimonio({ src, alt, ...props }) {
  // Reinicia a falha quando a seleção do mapa ou a imagem recebida muda.
  const url = normalizarUrlImagem(src);
  return <Imagem key={url} src={url} alt={alt} {...props} />;
}

function Imagem({ src, alt, ...props }) {
  const [falhou, setFalhou] = useState(false);
  const indisponivel = !src || falhou;
  return (
    <img
      {...props}
      src={indisponivel ? FALLBACK : src}
      alt={indisponivel ? (alt ? `Imagem indisponível: ${alt}` : "") : alt}
      onError={indisponivel ? undefined : () => setFalhou(true)}
    />
  );
}
