import pool from "../config/database.js";

/**
 * Este arquivo cuida do CRUD de usuários usado pelo painel admin. Ele é
 * separado do services/authService.js de propósito: authService.js existe
 * só pra checar login (e por isso ele lê a senha do banco), enquanto aqui
 * a senha nunca sai do banco nas consultas de listagem ou detalhe. Separar
 * os dois deixa claro, só de olhar o import, quando um código tem motivo
 * de verdade pra tocar em senha e quando não tem.
 */

const SELECT_SEM_SENHA = "SELECT id, nome, email, perfil FROM usuarios";

export async function listarUsuarios() {
  const [linhas] = await pool.query(`${SELECT_SEM_SENHA} ORDER BY id`);
  return linhas;
}

export async function buscarUsuarioPorId(id) {
  const [linhas] = await pool.query(`${SELECT_SEM_SENHA} WHERE id = ?`, [id]);
  return linhas[0] ?? null;
}

export async function buscarUsuarioPorEmail(email) {
  const [linhas] = await pool.query(`${SELECT_SEM_SENHA} WHERE email = ?`, [
    email,
  ]);
  return linhas[0] ?? null;
}

export async function criarUsuario(dados) {
  const [resultado] = await pool.query(
    "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
    [
      dados.nome.trim(),
      dados.email.trim().toLowerCase(),
      dados.senha,
      dados.perfil || "tecnico",
    ],
  );

  return buscarUsuarioPorId(resultado.insertId);
}

// A senha só é atualizada quando vem preenchida no formulário. Deixar o
// campo em branco na edição significa "mantenha a senha que já existe".
export async function atualizarUsuario(id, dados) {
  const existente = await buscarUsuarioPorId(id);
  if (!existente) return null;

  if (dados.senha) {
    await pool.query(
      "UPDATE usuarios SET nome = ?, email = ?, perfil = ?, senha = ? WHERE id = ?",
      [
        dados.nome.trim(),
        dados.email.trim().toLowerCase(),
        dados.perfil,
        dados.senha,
        id,
      ],
    );
  } else {
    await pool.query(
      "UPDATE usuarios SET nome = ?, email = ?, perfil = ? WHERE id = ?",
      [dados.nome.trim(), dados.email.trim().toLowerCase(), dados.perfil, id],
    );
  }

  return buscarUsuarioPorId(id);
}

export async function excluirUsuario(id) {
  const [resultado] = await pool.query("DELETE FROM usuarios WHERE id = ?", [
    id,
  ]);
  return resultado.affectedRows > 0;
}
