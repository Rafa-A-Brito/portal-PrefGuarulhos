import "./MetadataEditorial.css";

export default function MetadataEditorial({ item }) {
  const numero = item.numeroExibicao;
  const regiao = item.regiao?.nome;
  const temNumero = Number.isInteger(numero) && numero >= 1;
  if (!temNumero && !regiao) return null;
  return <div className="metadata-editorial" aria-label="Identificação editorial">
    {temNumero && <span>Nº {numero}</span>}
    {regiao && <span>Região: {regiao}</span>}
  </div>;
}
