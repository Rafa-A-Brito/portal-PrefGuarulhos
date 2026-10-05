import {
  BuildingLibraryIcon,
  SparklesIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

/**
 * Metadados centralizados por categoria de patrimônio: label exibido,
 * ícone (Heroicons) e cor. Usados no badge do PlaquetaCard, na FiltroBar,
 * nos chips da Home, na legenda e nos pinos do mapa.
 *
 * A cor mora aqui (e não no CSS) pra legenda e os pinos do mapa nunca
 * ficarem diferentes: os dois leem deste mesmo objeto. Mantenha as chaves
 * iguais às do campo "categoria" no banco (e em CATEGORIAS_VALIDAS, em
 * backend/src/utils/validadores.js).
 */
export const CATEGORIA_META = {
  arquitetonico: {
    label: "Arquitetônico",
    cor: "#424039",
    Icon: BuildingLibraryIcon,
  },
  imaterial: {
    label: "Imaterial",
    cor: "#c6780c",
    Icon: SparklesIcon,
  },
  natural: {
    label: "Natural",
    cor: "#32e313",
    Icon: GlobeAltIcon,
  },
  documental: {
    label: "Documental",
    cor: "#4cc4b0",
    Icon: DocumentTextIcon,
  },
  demolido: {
    label: "Demolido",
    cor: "#ff0202",
    Icon: ExclamationTriangleIcon,
  },
};

/**
 * Ordem de exibição das categorias nos filtros e chips (sem "todos",
 * que cada componente já trata separadamente como opção fixa).
 */
export const CATEGORIAS_ORDEM = [
  "arquitetonico",
  "imaterial",
  "natural",
  "documental",
  "demolido",
];
