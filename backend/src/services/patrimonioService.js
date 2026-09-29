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
    localizacao: {
      lat: lat === null ? null : Number(lat),
      lng: lng === null ? null : Number(lng),
    },
  };
}

// O formulário do admin manda lat e lng como texto, e quando o campo fica
// vazio isso chega aqui como uma string vazia, não como null ou undefined.
// O MySQL não aceita string vazia numa coluna decimal, então precisamos
// tratar esse caso à parte antes de montar a query.
function paraNumeroOuNulo(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
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

// Os ids são texto (ex.: "12") por causa dos dados que já existiam antes do
// banco, então geramos o próximo número olhando o maior id salvo até agora.
async function gerarProximoId() {
  const [linhas] = await pool.query(
    "SELECT MAX(CAST(id AS UNSIGNED)) AS maior FROM patrimonios",
  );
  const maior = linhas[0]?.maior ?? 0;
  return String(maior + 1);
}

export async function criarPatrimonio(dados) {
  const id = await gerarProximoId();

  await pool.query(
    `INSERT INTO patrimonios
      (id, nome, categoria, bairro, endereco, cep, resumo, imagem_principal, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      dados.nome.trim(),
      dados.categoria,
      dados.bairro.trim(),
      dados.endereco?.trim() || null,
      dados.cep?.trim() || null,
      dados.resumo.trim(),
      dados.imagemPrincipal?.trim() || null,
      paraNumeroOuNulo(dados.lat),
      paraNumeroOuNulo(dados.lng),
    ],
  );

  return buscarPatrimonioPorId(id);
}

export async function atualizarPatrimonio(id, dados) {
  const existente = await buscarPatrimonioPorId(id);
  if (!existente) return null;

  await pool.query(
    `UPDATE patrimonios SET
      nome = ?, categoria = ?, bairro = ?, endereco = ?, cep = ?,
      resumo = ?, imagem_principal = ?, lat = ?, lng = ?
     WHERE id = ?`,
    [
      dados.nome.trim(),
      dados.categoria,
      dados.bairro.trim(),
      dados.endereco?.trim() || null,
      dados.cep?.trim() || null,
      dados.resumo.trim(),
      dados.imagemPrincipal?.trim() || null,
      paraNumeroOuNulo(dados.lat),
      paraNumeroOuNulo(dados.lng),
      id,
    ],
  );

  return buscarPatrimonioPorId(id);
}

export async function excluirPatrimonio(id) {
  const [resultado] = await pool.query(
    "DELETE FROM patrimonios WHERE id = ?",
    [id],
  );
  return resultado.affectedRows > 0;
}
