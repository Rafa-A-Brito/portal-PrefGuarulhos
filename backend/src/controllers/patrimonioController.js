import * as patrimonioService from "../services/patrimonioService.js";

export async function listar(req, res, next) {
  try {
    const patrimonios = await patrimonioService.listarPatrimonios();
    res.json(patrimonios);
  } catch (err) {
    next(err);
  }
}

export async function buscarPorId(req, res, next) {
  try {
    const patrimonio = await patrimonioService.buscarPatrimonioPorId(
      req.params.id,
    );

    if (!patrimonio) {
      return res.status(404).json({ erro: "Patrimônio não encontrado." });
    }

    res.json(patrimonio);
  } catch (err) {
    next(err);
  }
}
