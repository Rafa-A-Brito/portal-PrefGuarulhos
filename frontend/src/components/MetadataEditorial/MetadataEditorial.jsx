import "./MetadataEditorial.css";

export default function MetadataEditorial({ item }) {
  const numero = item.numeroExibicao;
  const regiao = item.regiao?.nome;
  const temNumero = Number.isInteger(numero) && numero >= 1;
  if (!temNumero && !regiao) return null;
  return (
    <div className="metadata-editorial" aria-label="Identificação editorial">
      {temNumero && <span className="metadata-editorial-num">Nº {numero}</span>}
      {regiao && (
        <span className="metadata-editorial-regiao">
          <small>Região:</small> {regiao}
        </span>
      )}
    </div>
  );
}
