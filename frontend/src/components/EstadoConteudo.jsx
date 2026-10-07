export default function EstadoConteudo({ estado, nome }) {
  if (estado.carregando) return <p role="status">Carregando {nome}…</p>;
  if (estado.erro) return <div role="alert"><p>{estado.erro}</p><button type="button" className="btn-outline" onClick={estado.tentarNovamente}>Tentar novamente</button></div>;
  if (!estado.itens.length) return <p>Nenhum conteúdo de {nome} publicado no momento.</p>;
  if (estado.itens.some((item) => item.demonstracao)) return <p role="status">Servidor indisponível. Exibindo exemplos locais de desenvolvimento.</p>;
  return null;
}
