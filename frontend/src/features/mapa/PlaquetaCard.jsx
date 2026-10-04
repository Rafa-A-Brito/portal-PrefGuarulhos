import { Link } from "react-router-dom";
import { MapPinIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { CATEGORIA_META } from "../categoriaMeta";

import SANATORIO_IMG from "../../assets/sanatorio_padre_bento.jpg";

export default function PlaquetaCard({ item }) {
  const meta = CATEGORIA_META[item.categoria];
  const Icon = meta?.Icon;

  return (
    <article className="plaqueta">
      <span className="rivet tl" />
      <span className="rivet tr" />
      <figure>
        <img
          src={item.imagemPrincipal}
          alt={item.nome}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = SANATORIO_IMG;
          }}
        />
        <span className={`cat-badge cat-${item.categoria}`}>
          {Icon && <Icon className="badge-icon" aria-hidden="true" />}
          {meta?.label ?? item.categoria}
        </span>
      </figure>
      <div className="plaqueta-body">
        <span className="num">Nº {String(item.id).padStart(3, "0")}</span>
        <h3>{item.nome}</h3>
        <div className="bairro">
          <MapPinIcon className="inline-icon" aria-hidden="true" />
          {item.bairro}
        </div>
        {item.cep && <span className="cep">CEP {item.cep}</span>}
        <p className="resumo">{item.resumo}</p>
        <Link
          className="verlink"
          to={`/patrimonios/${item.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          Ver detalhes{" "}
          <ArrowRightIcon className="inline-icon-sm" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
