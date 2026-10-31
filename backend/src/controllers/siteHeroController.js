import { siteHero } from "../services/index.js";
const { getHero, listHeroes } = siteHero;

export async function list(_req, res) {
    res.json({ success: true, data: await listHeroes() });
}

export async function detail(req, res) {
    res.json({ success: true, data: await getHero(req.params.pagina) });
}
