import { obterCoordenadas } from "./coordenadas";
import { camposEndereco } from "./endereco";
import { classificarLocalizacao } from "./politicaLocalizacao";

export function ehLocalAproximado(patrimonio) {
  return classificarLocalizacao(patrimonio).tipo === "APROXIMADA";
}

export function criarUrlRota(patrimonio) {
  const politica = classificarLocalizacao(patrimonio);
  if (!politica.permiteRota) return null;
  const { endereco, numero, complemento, bairro, cidade, uf, cep } = camposEndereco(patrimonio);
  const nome = patrimonio.nome?.trim();
  const historico = politica.tipo === "APROXIMADA";
  const coordenadas = obterCoordenadas(patrimonio);
  // Um POI com logradouro e contexto geográfico é identificável mesmo sem número.
  // Sem o POI histórico, exigir município/UF ou CEP para não buscar uma rua
  // homônima em outra cidade. O endereço continua sendo apenas aproximado.
  const textoIdentificavel = historico
    ? endereco && ((cidade && uf) || cep)
    : endereco && (bairro || cidade || uf || cep) && (nome || (numero && numero !== "s/n"));
  let destino;
  if (historico && coordenadas) {
    destino = `${coordenadas.lat},${coordenadas.lng}`;
  } else if (textoIdentificavel) {
    destino = [historico ? null : nome, endereco, numero, complemento, bairro,
      [cidade, uf].filter(Boolean).join(" - "), cep, "Brasil"]
      .filter(Boolean).join(", ");
  } else {
    if (!coordenadas) return null;
    destino = `${coordenadas.lat},${coordenadas.lng}`;
  }
  const params = new URLSearchParams({ api: "1", destination: destino, travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
