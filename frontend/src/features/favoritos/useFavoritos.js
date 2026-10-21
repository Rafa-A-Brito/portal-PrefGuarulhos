import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  alternarFavorito,
  assinarFavoritos,
  obterFavoritos,
} from "./favoritosStore";

const VAZIO = Object.freeze([]);

/**
 * Favoritos reativos (compartilhados entre Início e Patrimônios, e entre abas
 * pelo evento "storage"). Sem Provider: o estado vive no módulo da store.
 */
export function useFavoritos() {
  const lista = useSyncExternalStore(assinarFavoritos, obterFavoritos, () => VAZIO);
  const ids = useMemo(() => new Set(lista), [lista]);
  const ehFavorito = useCallback(id => ids.has(id), [ids]);
  return { ids, ehFavorito, alternar: alternarFavorito };
}
