import { useEffect, useState } from "react";
import api from "../../services/api";

/**
 * Busca a chave da Maps JavaScript API no backend (GET /config/mapa).
 *
 * Por que não ler de uma variável VITE_ no front: o Vite embute essas
 * variáveis no JavaScript na hora do build, então trocar a chave exigiria
 * rebuildar a imagem do front. Vindo do backend, ela fica configurada num
 * lugar só (backend/.env, variável GOOGLE_MAPS_KEY). O comentário em
 * backend/src/routes/configRoutes.js explica por que isso não é um
 * problema de segurança.
 *
 * A chave é buscada uma vez por sessão: o resultado fica guardado neste
 * módulo, então voltar pra página do mapa não faz outra requisição nem
 * mostra "carregando" de novo.
 *
 * Pra forçar o modo mockup mesmo com chave configurada (útil pra não
 * gastar cota da API enquanto mexe no layout), use VITE_USE_MOCK_MAP=true
 * no frontend/.env.local.
 */
const FORCAR_MOCKUP = import.meta.env.VITE_USE_MOCK_MAP === "true";

// undefined = ainda não buscou; null = buscou e não tem chave; string = chave
let chaveEmCache;
let requisicaoEmAndamento = null;

function buscarChave() {
  if (!requisicaoEmAndamento) {
    requisicaoEmAndamento = api
      .get("/config/mapa")
      .then(({ data }) => {
        chaveEmCache = data?.googleMapsApiKey || null;
        return chaveEmCache;
      })
      .catch((err) => {
        console.warn(
          "[Mapa] Não foi possível buscar a chave do Google Maps no backend. " +
            "O mapa vai abrir em modo mockup.",
          err.message,
        );
        // Libera pra tentar de novo numa próxima visita à página.
        requisicaoEmAndamento = null;
        return null;
      });
  }
  return requisicaoEmAndamento;
}

export function useChaveGoogleMaps() {
  const [estado, setEstado] = useState(() => {
    if (FORCAR_MOCKUP) return { carregando: false, apiKey: null };
    if (chaveEmCache !== undefined) {
      return { carregando: false, apiKey: chaveEmCache };
    }
    return { carregando: true, apiKey: null };
  });

  useEffect(() => {
    if (!estado.carregando) return;

    let ativo = true;
    buscarChave().then((apiKey) => {
      if (ativo) setEstado({ carregando: false, apiKey });
    });

    return () => {
      ativo = false;
    };
  }, [estado.carregando]);

  return estado;
}
