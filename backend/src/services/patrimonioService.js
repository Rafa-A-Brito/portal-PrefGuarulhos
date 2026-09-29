import pool from "../config/database.js";

const SELECT_BASE = `
  SELECT
    id, nome, categoria, bairro, endereco, cep, resumo,
    imagem_principal AS imagemPrincipal, lat, lng
  FROM patrimonios
`;

function formatarLocalizacao(linha) {
  const { lat, lng, ...resto } = linha;
  return {
    ...resto,
    localizacao: { lat: Number(lat), lng: Number(lng) },
  };
}

export async function listarPatrimonios() {
  const [linhas] = await pool.query(
    `${SELECT_BASE} ORDER BY CAST(id AS UNSIGNED)`,
  );
  return linhas.map(formatarLocalizacao);
}

export async function buscarPatrimonioPorId(id) {
  const [linhas] = await pool.query(`${SELECT_BASE} WHERE id = ? LIMIT 1`, [
    id,
  ]);
  if (!linhas.length) return null;
  return formatarLocalizacao(linhas[0]);
}
