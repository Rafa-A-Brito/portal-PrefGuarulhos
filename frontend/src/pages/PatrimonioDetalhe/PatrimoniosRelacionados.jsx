import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import "./PatrimoniosRelacionados.css";

export default function PatrimoniosRelacionados({ ligacoes }) {
  const tituloId = useId();
  // A API determina a relação e sua ordem; IDs da ligação não identificam o destino.
  const validas = (Array.isArray(ligacoes) ? ligacoes : []).filter((ligacao) => {
    const destino = ligacao?.destino;
    return typeof destino?.slug === "string" && destino.slug.length <= 220 &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(destino.slug) &&
      typeof destino.nome === "string" && destino.nome.trim() &&
      typeof ligacao.texto === "string" && ligacao.texto.trim();
  });
  if (!validas.length) return null;

  return (
    <section className="patrimonios-relacionados" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Patrimônios relacionados</h2>
      <ul className="patrimonios-relacionados-grid">
        {validas.map(({ id, destino, texto }) => (
          <li className="patrimonio-relacionado" key={id ?? destino.slug}>
            <h3>{destino.nome}</h3>
            <p>{texto}</p>
            <Link to={`/patrimonios/${destino.slug}`} className="patrimonio-relacionado-link"
              aria-label={`Conhecer patrimônio: ${destino.nome}`}>
              Conhecer patrimônio
              <ArrowRightIcon width={18} height={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
