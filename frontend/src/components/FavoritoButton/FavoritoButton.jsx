import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useFavoritos } from "../../features/favoritos/useFavoritos";
import "./FavoritoButton.css";

/**
 * Botão de coração. Deve ser IRMÃO do link do card (nunca dentro dele).
 * Identifica o patrimônio por item.id (slug público), nunca por posição.
 * `className` permite reaproveitar o posicionamento do contexto (ex.: destaque-fav).
 */
export default function FavoritoButton({ item, className = "" }) {
  const { ehFavorito, alternar } = useFavoritos();
  if (!item?.id) return null;
  const ativo = ehFavorito(item.id);
  const Icone = ativo ? HeartIconSolid : HeartIcon;
  return (
    <button
      type="button"
      className={`favorito-btn ${className}${ativo ? " is-ativo" : ""}`.trim()}
      aria-pressed={ativo}
      aria-label={
        ativo
          ? `Remover ${item.nome} dos favoritos`
          : `Adicionar ${item.nome} aos favoritos`
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation(); // não ativa o card/seleção do mapa
        alternar(item.id);
      }}
    >
      <Icone width={16} height={16} aria-hidden="true" />
    </button>
  );
}
