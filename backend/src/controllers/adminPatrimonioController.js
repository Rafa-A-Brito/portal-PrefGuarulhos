import * as patrimonioService from "../services/patrimonioService.js";
import { validarPatrimonio } from "../utils/validadores.js";

export async function criar(req, res, next) {
  try {
    const erros = validarPatrimonio(req.body);
    if (erros.length) {
      return res.status(400).json({ erros });
    }

    const patrimonio = await patrimonioService.criarPatrimonio(req.body);
    res.status(201).json(patrimonio);
  } catch (err) {
    next(err);
  }
}

export async function atualizar(req, res, next) {
  try {
    const erros = validarPatrimonio(req.body);
    if (erros.length) {
      return res.status(400).json({ erros });
    }

    const patrimonio = await patrimonioService.atualizarPatrimonio(
      req.params.id,
      req.body,
    );

    if (!patrimonio) {
      return res.status(404).json({ erro: "Patrimônio não encontrado." });
    }

    res.json(patrimonio);
  } catch (err) {
    next(err);
  }
}

export async function excluir(req, res, next) {
  try {
    const removido = await patrimonioService.excluirPatrimonio(req.params.id);

    if (!removido) {
      return res.status(404).json({ erro: "Patrimônio não encontrado." });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
