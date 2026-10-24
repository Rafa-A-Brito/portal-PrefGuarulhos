import { useEffect, useState } from "react";
import api from "../../../services/api";

// Imagens editoriais não publicadas exigem Bearer, que <img src> não envia.
// Buscamos apenas imagens do nosso próprio backend, sem expor tokens em URLs.
function imagemDaApi(url) {
  try {
    const origemApi = new URL(api.defaults.baseURL || "/api", window.location.origin);
    const destino = new URL(url, origemApi.origin);
    const caminho = decodeURIComponent(destino.pathname);
    const permitida = (
      (destino.origin === origemApi.origin || destino.origin === window.location.origin) &&
      !destino.username && !destino.password &&
      /^\/uploads\/(exposicoes|novidades)\/[\p{L}\p{N}_-]+\.(jpg|jpeg|png|webp|gif)$/iu.test(caminho)
    );
    // URL absoluta evita que o Axios acrescente /api antes de /uploads.
    return permitida ? new URL(destino.pathname, origemApi.origin).href : null;
  } catch {
    return null;
  }
}

export default function ImagemAdmin({ src, alt, style }) {
  const protegida = src ? imagemDaApi(src) : null;
  if (!protegida) return <img src={src} alt={alt} style={style} />;
  return <PreviaProtegida key={src} url={protegida} alt={alt} style={style} />;
}

function PreviaProtegida({ url, alt, style }) {
  const [carregada, setCarregada] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let urlTemporaria = null;
    let ativa = true;
    api.get(url, { responseType: "blob", signal: controller.signal }).then(({ data }) => {
      if (!ativa) return;
      urlTemporaria = URL.createObjectURL(data);
      setCarregada(urlTemporaria);
      setErro(null);
    }).catch((error) => {
      if (!ativa) return;
      setErro("Não foi possível carregar a imagem.");
      // A autenticação/renovação é tratada pelo interceptor da API.
      if (import.meta.env.DEV) console.warn("Prévia editorial indisponível:", error.message);
    });
    return () => {
      ativa = false;
      controller.abort();
      if (urlTemporaria) URL.revokeObjectURL(urlTemporaria);
    };
  }, [url]);

  if (!carregada) return <p role="status">{erro || "Carregando prévia da imagem…"}</p>;
  return <img src={carregada} alt={alt} style={style} />;
}
