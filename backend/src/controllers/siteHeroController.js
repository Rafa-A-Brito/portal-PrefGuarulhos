import { getHero, listHeroes } from "../services/siteHeroService.js";

export async function list(_req, res) {
    res.json({ success: true, data: await listHeroes() });
}

export async function detail(req, res) {
    res.json({ success: true, data: await getHero(req.params.pagina) });
}
