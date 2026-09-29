// Chave usada para guardar a sessão de mock no sessionStorage. Fica num
// arquivo à parte porque tanto o AuthContext (que escreve a sessão) quanto
// o api.js (que lê a sessão pra montar os headers de cada requisição)
// precisam dela, e é melhor ter um único lugar de verdade do que repetir a
// mesma string em dois arquivos e arriscar ela ficar diferente em um deles.
export const CHAVE_SESSAO_MOCK = "guarulhos.admin.sessao";
