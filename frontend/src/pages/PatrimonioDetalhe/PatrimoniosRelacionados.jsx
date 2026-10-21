import { useId } from "react";
import { Link } from "react-router-dom";
import IMAGEM_ALTERNATIVA from "../../assets/patrimonios/back_image.png";
import "./PatrimoniosRelacionados.css";

export default function PatrimoniosRelacionados({ ligacoes, patrimonios = [] }) {
  const tituloId = useId();
  // A API determina a relação e sua ordem; IDs da ligação não identificam o destino.
  const validas = (Array.isArray(ligacoes) ? ligacoes : []).filter((ligacao) => {
    const destino = ligacao?.destino;
    return typeof destino?.slug === "string" && destino.slug.length <= 220 &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(destino.slug) &&
      typeof destino.nome === "string" && destino.nome.trim();
  });
  if (!validas.length) return null;

  return (
    <section className="patrimonios-relacionados" aria-labelledby={tituloId}>
      <h2 id={tituloId}>Patrimônios relacionados</h2>
      <ul className="patrimonios-relacionados-grid">
        {validas.map(({ id, destino }) => {
          // O catálogo complementa apenas a capa; nunca cria novas relações.
          const patrimonio = patrimonios.find((item) => item.slug === destino.slug);
          const capa = patrimonio?.imagemPrincipal?.trim() || IMAGEM_ALTERNATIVA;
          return (
          <li className="patrimonio-relacionado" key={id ?? destino.slug}>
            <Link to={`/patrimonios/${destino.slug}`} className="patrimonio-relacionado-link"
              aria-label={`Conhecer patrimônio: ${destino.nome}`}>
              <img src={capa} alt="" loading="lazy"
                onError={(event) => {
                  const imagem = event.currentTarget;
                  if (imagem.getAttribute("src") !== IMAGEM_ALTERNATIVA) {
                    imagem.src = IMAGEM_ALTERNATIVA;
                  }
                }} />
              <h3>{destino.nome}</h3>
            </Link>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
