import {
  AcademicCapIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  ClockIcon,
  GlobeAltIcon,
  SparklesIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

/**
 * Metadados centralizados por categoria de patrimônio — label exibido e
 * ícone (Heroicons) usados no badge do PlaquetaCard, na FiltroBar e nos
 * chips de categoria da Home.
 *
 * As chaves agora são os SLUGS de verdade das categorias que existem no
 * banco (ver backend/prisma/seed.js — o Categoria.slug é gerado a partir
 * do nome por slugify(), ex.: "Arquitetônico" -> "arquitetonico"). Antes
 * essas chaves eram inventadas no frontend (arquitetonico, imaterial,
 * natural, documental, demolido) e não batiam com o que o backend
 * realmente tem — ajuste aqui se o time de conteúdo cadastrar categorias
 * novas, ou renomear/remover alguma das existentes.
 *
 * "demolido" SAIU daqui de propósito: no backend isso não é uma
 * categoria, é um valor do campo "situacao" do patrimônio (enum
 * SituacaoPatrimonio, valor DEMOLIDO) — um patrimônio arquitetônico
 * demolido continua sendo "Arquitetônico" como categoria. Se quiser um
 * selo visual de "demolido" no card/detalhe, ele deveria checar
 * `item.situacao === "DEMOLIDO"` separadamente, não entrar na lista de
 * categorias filtráveis.
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
  ferroviario: {
    label: "Ferroviário",
    Icon: TruckIcon,
  },
  industrial: {
    label: "Industrial",
    Icon: BuildingOffice2Icon,
  },
  educacional: {
    label: "Educacional",
    Icon: AcademicCapIcon,
  },
  ambiental: {
    label: "Ambiental",
    Icon: GlobeAltIcon,
  },
  historico: {
    label: "Histórico",
    Icon: ClockIcon,
  },
};

/**
 * Ordem de exibição das categorias nos filtros e chips (sem "todos",
 * que cada componente já trata separadamente como opção fixa).
 */
export const CATEGORIAS_ORDEM = [
  "arquitetonico",
  "historico",
  "imaterial",
  "ambiental",
  "ferroviario",
  "educacional",
  "industrial",
];
