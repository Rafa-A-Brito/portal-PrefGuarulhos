import * as usuarioService from "../services/usuarioService.js";
import { validarUsuario } from "../utils/validadores.js";

export async function listar(req, res, next) {
  try {
    const usuarios = await usuarioService.listarUsuarios();
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
}

export async function criar(req, res, next) {
  try {
    const erros = validarUsuario(req.body, { exigirSenha: true });
    if (erros.length) {
      return res.status(400).json({ erros });
    }

    const usuario = await usuarioService.criarUsuario(req.body);
    res.status(201).json(usuario);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ erro: "Já existe um usuário com esse e-mail." });
    }
    next(err);
  }
}

export async function atualizar(req, res, next) {
  try {
    const erros = validarUsuario(req.body, { exigirSenha: false });
    if (erros.length) {
      return res.status(400).json({ erros });
    }

    const usuario = await usuarioService.atualizarUsuario(
      req.params.id,
      req.body,
    );

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.json(usuario);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ erro: "Já existe um usuário com esse e-mail." });
    }
    next(err);
  }
}

export async function excluir(req, res, next) {
  try {
    const alvo = await usuarioService.buscarUsuarioPorId(req.params.id);

    if (!alvo) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    // Trava simples pra ninguém conseguir apagar o último administrador e
    // ficar todo mundo trancado pra fora do painel.
    if (alvo.perfil === "admin") {
      const usuarios = await usuarioService.listarUsuarios();
      const totalAdmins = usuarios.filter((u) => u.perfil === "admin").length;

      if (totalAdmins <= 1) {
        return res.status(400).json({
          erro: "Não é possível excluir o único administrador restante.",
        });
      }
    }

    await usuarioService.excluirUsuario(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
