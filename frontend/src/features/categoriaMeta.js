import {
  BuildingLibraryIcon,
  SparklesIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

/**
 * Metadados centralizados por categoria de patrimônio — label exibido e
 * ícone (Heroicons) usados no badge do PlaquetaCard, na FiltroBar e nos
 * chips de categoria da Home. Mantenha as chaves iguais às usadas no
 * campo "categoria" de features/mocks/patrimoniosMock.js.
 */
export const CATEGORIA_META = {
  arquitetonico: {
    label: "Arquitetônico",
    Icon: BuildingLibraryIcon,
  },
  imaterial: {
    label: "Imaterial",
    Icon: SparklesIcon,
  },
  natural: {
    label: "Natural",
    Icon: GlobeAltIcon,
  },
  documental: {
    label: "Documental",
    Icon: DocumentTextIcon,
  },
  demolido: {
    label: "Demolido",
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
