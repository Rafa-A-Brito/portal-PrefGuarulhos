import { Router } from "express";

const router = Router();

/**
 * GET /config/mapa
 *
 * Entrega pro front a chave da Maps JavaScript API que fica em
 * backend/.env (GOOGLE_MAPS_KEY).
 *
 * Vale deixar claro: isso não esconde a chave. Uma chave da Maps
 * JavaScript API sempre acaba no navegador, porque é o próprio navegador
 * que baixa o script do Google com ela. O que protege a chave é a
 * restrição por referenciador HTTP configurada no Google Cloud (só os
 * domínios do site podem usá-la). O motivo de passar pelo backend é outro:
 * ter um lugar só pra configurar a chave, e poder trocá-la sem rebuildar o
 * front (o Vite embute variáveis VITE_* no JavaScript na hora do build).
 *
 * Quando a chave não está configurada, devolve null e o front cai no modo
 * mockup do mapa, sem quebrar nada.
 */
router.get("/mapa", (req, res) => {
  // O navegador pode reaproveitar a resposta por alguns minutos; o front
  // também guarda em memória, então isso é chamado uma vez por sessão.
  res.set("Cache-Control", "public, max-age=300");
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_KEY || null });
});

export default router;
