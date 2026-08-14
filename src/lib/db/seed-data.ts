import type { NewModel, NewModelYear, NewSpecCategory } from "./schema";

/**
 * Reference seed data for the Brazilian market.
 * Values are sample/illustrative — production data is curated via admin panel
 * and synced from FIPE / FENABRAVE.
 */

type FuelType = NonNullable<NewModelYear["fuelType"]>;

export interface SeedSpec {
  categorySlug: string;
  value: string;
  numericValue?: number;
  displayValue?: string;
}

export interface SeedModelYear {
  year: number;
  fuelType: FuelType;
  fipeCode: string;
  isZeroKm: boolean;
  priceFipe: string;
  specs: SeedSpec[];
}

export interface SeedModel {
  brandSlug: string;
  name: string;
  slug: string;
  category: NewModel["category"];
  sizeCategory?: string | null;
  modelYears: SeedModelYear[];
}

export interface SeedBrand {
  name: string;
  slug: string;
  originCountry: string;
  logoUrl?: string;
}

/* ------------------------------------------------------------------ */
/* Spec categories — the 14 comparison groups                          */
/* ------------------------------------------------------------------ */

export const seedSpecCategories: NewSpecCategory[] = [
  // Price
  {
    name: "Preço FIPE 0km",
    slug: "fipe-price-0km",
    unit: "R$",
    displayOrder: 1,
    group: "price",
    higherIsBetter: false,
    isNumeric: true,
  },
  {
    name: "Depreciação 12 meses",
    slug: "depreciation-12m",
    unit: "%",
    displayOrder: 2,
    group: "price",
    higherIsBetter: false,
    isNumeric: true,
  },
  // Engine
  { name: "Motor", slug: "engine-type", displayOrder: 10, group: "engine", isNumeric: false },
  {
    name: "Cilindros",
    slug: "cylinders",
    unit: "cil.",
    displayOrder: 11,
    group: "engine",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Válvulas",
    slug: "valves",
    unit: "válv.",
    displayOrder: 12,
    group: "engine",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Cilindrada",
    slug: "displacement",
    unit: "cc",
    displayOrder: 13,
    group: "engine",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Potência",
    slug: "power",
    unit: "cv",
    displayOrder: 14,
    group: "engine",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Torque",
    slug: "torque",
    unit: "kgfm",
    displayOrder: 15,
    group: "engine",
    higherIsBetter: true,
    isNumeric: true,
  },
  { name: "Injeção", slug: "injection", displayOrder: 16, group: "engine", isNumeric: false },
  { name: "Ignição", slug: "ignition", displayOrder: 17, group: "engine", isNumeric: false },
  { name: "Combustível", slug: "fuel-type", displayOrder: 18, group: "engine", isNumeric: false },
  {
    name: "Velocidade máxima",
    slug: "top-speed",
    unit: "km/h",
    displayOrder: 19,
    group: "engine",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "0-100 km/h",
    slug: "acceleration-0-100",
    unit: "s",
    displayOrder: 20,
    group: "engine",
    higherIsBetter: false,
    isNumeric: true,
  },
  // Transmission
  {
    name: "Câmbio",
    slug: "transmission-type",
    displayOrder: 30,
    group: "transmission",
    isNumeric: false,
  },
  {
    name: "Marchas",
    slug: "gears",
    unit: "marchas",
    displayOrder: 31,
    group: "transmission",
    higherIsBetter: true,
    isNumeric: true,
  },
  { name: "Tração", slug: "traction", displayOrder: 32, group: "transmission", isNumeric: false },
  // Weight
  {
    name: "Peso",
    slug: "weight",
    unit: "kg",
    displayOrder: 40,
    group: "weight",
    higherIsBetter: false,
    isNumeric: true,
  },
  {
    name: "Peso/potência",
    slug: "weight-to-power",
    unit: "kg/cv",
    displayOrder: 41,
    group: "weight",
    higherIsBetter: false,
    isNumeric: true,
  },
  // Steering
  { name: "Direção", slug: "steering-type", displayOrder: 50, group: "steering", isNumeric: false },
  {
    name: "Diâmetro de giro",
    slug: "turning-diameter",
    unit: "m",
    displayOrder: 51,
    group: "steering",
    higherIsBetter: false,
    isNumeric: true,
  },
  // Dimensions
  {
    name: "Comprimento",
    slug: "length",
    unit: "mm",
    displayOrder: 60,
    group: "dimensions",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Largura",
    slug: "width",
    unit: "mm",
    displayOrder: 61,
    group: "dimensions",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Altura",
    slug: "height",
    unit: "mm",
    displayOrder: 62,
    group: "dimensions",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Entre-eixos",
    slug: "wheelbase",
    unit: "mm",
    displayOrder: 63,
    group: "dimensions",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Porta-malas",
    slug: "trunk",
    unit: "L",
    displayOrder: 64,
    group: "dimensions",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Tanque",
    slug: "fuel-tank",
    unit: "L",
    displayOrder: 65,
    group: "dimensions",
    higherIsBetter: true,
    isNumeric: true,
  },
  // Consumption
  {
    name: "Consumo cidade (gasolina)",
    slug: "consumption-city-gasoline",
    unit: "km/l",
    displayOrder: 70,
    group: "consumption",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Consumo estrada (gasolina)",
    slug: "consumption-highway-gasoline",
    unit: "km/l",
    displayOrder: 71,
    group: "consumption",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Consumo cidade (etanol)",
    slug: "consumption-city-ethanol",
    unit: "km/l",
    displayOrder: 72,
    group: "consumption",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Consumo estrada (etanol)",
    slug: "consumption-highway-ethanol",
    unit: "km/l",
    displayOrder: 73,
    group: "consumption",
    higherIsBetter: true,
    isNumeric: true,
  },
  // Suspension
  {
    name: "Suspensão dianteira",
    slug: "suspension-front",
    displayOrder: 80,
    group: "suspension",
    isNumeric: false,
  },
  {
    name: "Suspensão traseira",
    slug: "suspension-rear",
    displayOrder: 81,
    group: "suspension",
    isNumeric: false,
  },
  // Brakes
  {
    name: "Freio dianteiro",
    slug: "brakes-front",
    displayOrder: 90,
    group: "brakes",
    isNumeric: false,
  },
  {
    name: "Freio traseiro",
    slug: "brakes-rear",
    displayOrder: 91,
    group: "brakes",
    isNumeric: false,
  },
  // Warranty
  {
    name: "Garantia total",
    slug: "warranty-total",
    displayOrder: 100,
    group: "warranty",
    isNumeric: false,
  },
  // Accessories
  { name: "Rodas", slug: "wheels", displayOrder: 110, group: "accessories", isNumeric: false },
  { name: "Faróis", slug: "headlights", displayOrder: 111, group: "accessories", isNumeric: false },
  {
    name: "Teto solar",
    slug: "sunroof",
    displayOrder: 112,
    group: "accessories",
    isNumeric: false,
  },
  // Comfort / Technology
  {
    name: "Ar-condicionado",
    slug: "air-conditioning",
    displayOrder: 120,
    group: "comfort_technology",
    isNumeric: false,
  },
  {
    name: "Central multimídia",
    slug: "infotainment",
    displayOrder: 121,
    group: "comfort_technology",
    isNumeric: false,
  },
  {
    name: "Conectividade",
    slug: "connectivity",
    displayOrder: 122,
    group: "comfort_technology",
    isNumeric: false,
  },
  {
    name: "Assistente de estacionamento",
    slug: "parking-assist",
    displayOrder: 123,
    group: "comfort_technology",
    isNumeric: false,
  },
  // Safety
  {
    name: "Airbags",
    slug: "airbags",
    unit: "un.",
    displayOrder: 130,
    group: "safety",
    higherIsBetter: true,
    isNumeric: true,
  },
  {
    name: "Controle de estabilidade",
    slug: "esc",
    displayOrder: 131,
    group: "safety",
    isNumeric: false,
  },
  { name: "Controle de tração", slug: "tcs", displayOrder: 132, group: "safety", isNumeric: false },
  {
    name: "Assistente de rampa",
    slug: "hill-assist",
    displayOrder: 133,
    group: "safety",
    isNumeric: false,
  },
];

/* ------------------------------------------------------------------ */
/* Brands                                                              */
/* ------------------------------------------------------------------ */

export const seedBrands: SeedBrand[] = [
  {
    name: "Fiat",
    slug: "fiat",
    originCountry: "Itália",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/FIAT_logo.svg/200px-FIAT_logo.svg.png",
  },
  {
    name: "Volkswagen",
    slug: "volkswagen",
    originCountry: "Alemanha",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/200px-Volkswagen_logo_2019.svg.png",
  },
  {
    name: "Chevrolet",
    slug: "chevrolet",
    originCountry: "Estados Unidos",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Chevrolet_logo.svg/200px-Chevrolet_logo.svg.png",
  },
  {
    name: "Hyundai",
    slug: "hyundai",
    originCountry: "Coreia do Sul",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/200px-Hyundai_Motor_Company_logo.svg.png",
  },
  {
    name: "Toyota",
    slug: "toyota",
    originCountry: "Japão",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_car_logo.svg/200px-Toyota_car_logo.svg.png",
  },
  {
    name: "Honda",
    slug: "honda",
    originCountry: "Japão",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Honda_logo.svg/200px-Honda_logo.svg.png",
  },
  {
    name: "Renault",
    slug: "renault",
    originCountry: "França",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Renault_2021_logo.svg/200px-Renault_2021_logo.svg.png",
  },
  {
    name: "Nissan",
    slug: "nissan",
    originCountry: "Japão",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Nissan_logo.svg/200px-Nissan_logo.svg.png",
  },
  {
    name: "Peugeot",
    slug: "peugeot",
    originCountry: "França",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Peugeot_Logo_%282010%29.svg/200px-Peugeot_Logo_%282010%29.svg.png",
  },
  {
    name: "BYD",
    slug: "byd",
    originCountry: "China",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/BYD_Auto_logo.svg/200px-BYD_Auto_logo.svg.png",
  },
];

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

export const seedModels: SeedModel[] = [
  {
    brandSlug: "hyundai",
    name: "HB20",
    slug: "hb20",
    category: "hatch",
    sizeCategory: "compacto",
    modelYears: [
      {
        year: 2025,
        fuelType: "flex",
        fipeCode: "008048-1",
        isZeroKm: true,
        priceFipe: "98500",
        specs: [
          { categorySlug: "engine-type", value: "1.0 Turbo Flex" },
          { categorySlug: "cylinders", value: "3", numericValue: 3 },
          { categorySlug: "valves", value: "12", numericValue: 12 },
          { categorySlug: "displacement", value: "998 cc", numericValue: 998 },
          {
            categorySlug: "power",
            value: "120 cv",
            numericValue: 120,
            displayValue: "120 cv @ 5750 rpm",
          },
          {
            categorySlug: "torque",
            value: "17.5 kgfm",
            numericValue: 17.5,
            displayValue: "17.5 kgfm @ 1500 rpm",
          },
          { categorySlug: "injection", value: "Direta" },
          { categorySlug: "ignition", value: "Eletrônica" },
          { categorySlug: "fuel-type", value: "Flex" },
          { categorySlug: "top-speed", value: "190 km/h", numericValue: 190 },
          { categorySlug: "acceleration-0-100", value: "9.9 s", numericValue: 9.9 },
          { categorySlug: "transmission-type", value: "Automática" },
          { categorySlug: "gears", value: "6", numericValue: 6 },
          { categorySlug: "traction", value: "Dianteira" },
          { categorySlug: "weight", value: "1.090 kg", numericValue: 1090 },
          { categorySlug: "steering-type", value: "Elétrica" },
          { categorySlug: "length", value: "4.284 mm", numericValue: 4284 },
          { categorySlug: "width", value: "1.720 mm", numericValue: 1720 },
          { categorySlug: "height", value: "1.470 mm", numericValue: 1470 },
          { categorySlug: "wheelbase", value: "2.530 mm", numericValue: 2530 },
          { categorySlug: "trunk", value: "300 L", numericValue: 300 },
          { categorySlug: "fuel-tank", value: "50 L", numericValue: 50 },
          { categorySlug: "consumption-city-gasoline", value: "13.5 km/l", numericValue: 13.5 },
          { categorySlug: "consumption-highway-gasoline", value: "15.2 km/l", numericValue: 15.2 },
          { categorySlug: "consumption-city-ethanol", value: "9.5 km/l", numericValue: 9.5 },
          { categorySlug: "consumption-highway-ethanol", value: "10.8 km/l", numericValue: 10.8 },
          { categorySlug: "suspension-front", value: "McPherson" },
          { categorySlug: "suspension-rear", value: "Eixo de torção" },
          { categorySlug: "brakes-front", value: "Disco ventilado" },
          { categorySlug: "brakes-rear", value: "Tambor" },
          { categorySlug: "warranty-total", value: "5 anos" },
          { categorySlug: "wheels", value: 'Liga leve 15"' },
          { categorySlug: "headlights", value: "Projetor LED" },
          { categorySlug: "air-conditioning", value: "Automático digital" },
          { categorySlug: "infotainment", value: '8" touchscreen' },
          { categorySlug: "connectivity", value: "Apple CarPlay / Android Auto" },
          { categorySlug: "airbags", value: "6", numericValue: 6 },
          { categorySlug: "esc", value: "Sim" },
          { categorySlug: "tcs", value: "Sim" },
          { categorySlug: "hill-assist", value: "Sim" },
        ],
      },
    ],
  },
  {
    brandSlug: "chevrolet",
    name: "Onix",
    slug: "onix",
    category: "hatch",
    sizeCategory: "compacto",
    modelYears: [
      {
        year: 2025,
        fuelType: "flex",
        fipeCode: "004976-3",
        isZeroKm: true,
        priceFipe: "96200",
        specs: [
          { categorySlug: "engine-type", value: "1.0 Turbo Flex" },
          { categorySlug: "cylinders", value: "3", numericValue: 3 },
          { categorySlug: "valves", value: "12", numericValue: 12 },
          { categorySlug: "displacement", value: "999 cc", numericValue: 999 },
          {
            categorySlug: "power",
            value: "116 cv",
            numericValue: 116,
            displayValue: "116 cv @ 5500 rpm",
          },
          {
            categorySlug: "torque",
            value: "16.8 kgfm",
            numericValue: 16.8,
            displayValue: "16.8 kgfm @ 2000 rpm",
          },
          { categorySlug: "injection", value: "Direta" },
          { categorySlug: "ignition", value: "Eletrônica" },
          { categorySlug: "fuel-type", value: "Flex" },
          { categorySlug: "top-speed", value: "185 km/h", numericValue: 185 },
          { categorySlug: "acceleration-0-100", value: "10.1 s", numericValue: 10.1 },
          { categorySlug: "transmission-type", value: "Automática" },
          { categorySlug: "gears", value: "6", numericValue: 6 },
          { categorySlug: "traction", value: "Dianteira" },
          { categorySlug: "weight", value: "1.075 kg", numericValue: 1075 },
          { categorySlug: "steering-type", value: "Elétrica" },
          { categorySlug: "length", value: "4.163 mm", numericValue: 4163 },
          { categorySlug: "width", value: "1.730 mm", numericValue: 1730 },
          { categorySlug: "height", value: "1.475 mm", numericValue: 1475 },
          { categorySlug: "wheelbase", value: "2.551 mm", numericValue: 2551 },
          { categorySlug: "trunk", value: "275 L", numericValue: 275 },
          { categorySlug: "fuel-tank", value: "44 L", numericValue: 44 },
          { categorySlug: "consumption-city-gasoline", value: "13.8 km/l", numericValue: 13.8 },
          { categorySlug: "consumption-highway-gasoline", value: "16.1 km/l", numericValue: 16.1 },
          { categorySlug: "consumption-city-ethanol", value: "9.7 km/l", numericValue: 9.7 },
          { categorySlug: "consumption-highway-ethanol", value: "11.3 km/l", numericValue: 11.3 },
          { categorySlug: "suspension-front", value: "McPherson" },
          { categorySlug: "suspension-rear", value: "Eixo de torção" },
          { categorySlug: "brakes-front", value: "Disco ventilado" },
          { categorySlug: "brakes-rear", value: "Tambor" },
          { categorySlug: "warranty-total", value: "3 anos" },
          { categorySlug: "wheels", value: 'Liga leve 15"' },
          { categorySlug: "headlights", value: "Projetor LED" },
          { categorySlug: "air-conditioning", value: "Manual" },
          { categorySlug: "infotainment", value: '8" touchscreen' },
          { categorySlug: "connectivity", value: "Apple CarPlay / Android Auto" },
          { categorySlug: "airbags", value: "6", numericValue: 6 },
          { categorySlug: "esc", value: "Sim" },
          { categorySlug: "tcs", value: "Sim" },
          { categorySlug: "hill-assist", value: "Sim" },
        ],
      },
    ],
  },
  {
    brandSlug: "volkswagen",
    name: "Polo",
    slug: "polo",
    category: "hatch",
    sizeCategory: "compacto",
    modelYears: [
      {
        year: 2025,
        fuelType: "flex",
        fipeCode: "005127-3",
        isZeroKm: true,
        priceFipe: "99800",
        specs: [
          { categorySlug: "engine-type", value: "1.0 Aspirado Flex" },
          { categorySlug: "cylinders", value: "3", numericValue: 3 },
          { categorySlug: "valves", value: "12", numericValue: 12 },
          { categorySlug: "displacement", value: "999 cc", numericValue: 999 },
          {
            categorySlug: "power",
            value: "109 cv",
            numericValue: 109,
            displayValue: "109 cv @ 5500 rpm",
          },
          {
            categorySlug: "torque",
            value: "16.1 kgfm",
            numericValue: 16.1,
            displayValue: "16.1 kgfm @ 3500 rpm",
          },
          { categorySlug: "injection", value: "Multiponto" },
          { categorySlug: "ignition", value: "Eletrônica" },
          { categorySlug: "fuel-type", value: "Flex" },
          { categorySlug: "top-speed", value: "182 km/h", numericValue: 182 },
          { categorySlug: "acceleration-0-100", value: "10.5 s", numericValue: 10.5 },
          { categorySlug: "transmission-type", value: "Manual" },
          { categorySlug: "gears", value: "5", numericValue: 5 },
          { categorySlug: "traction", value: "Dianteira" },
          { categorySlug: "weight", value: "1.109 kg", numericValue: 1109 },
          { categorySlug: "steering-type", value: "Elétrica" },
          { categorySlug: "length", value: "4.074 mm", numericValue: 4074 },
          { categorySlug: "width", value: "1.751 mm", numericValue: 1751 },
          { categorySlug: "height", value: "1.474 mm", numericValue: 1474 },
          { categorySlug: "wheelbase", value: "2.566 mm", numericValue: 2566 },
          { categorySlug: "trunk", value: "300 L", numericValue: 300 },
          { categorySlug: "fuel-tank", value: "52 L", numericValue: 52 },
          { categorySlug: "consumption-city-gasoline", value: "12.1 km/l", numericValue: 12.1 },
          { categorySlug: "consumption-highway-gasoline", value: "13.9 km/l", numericValue: 13.9 },
          { categorySlug: "consumption-city-ethanol", value: "8.4 km/l", numericValue: 8.4 },
          { categorySlug: "consumption-highway-ethanol", value: "9.8 km/l", numericValue: 9.8 },
          { categorySlug: "suspension-front", value: "McPherson" },
          { categorySlug: "suspension-rear", value: "Eixo de torção" },
          { categorySlug: "brakes-front", value: "Disco ventilado" },
          { categorySlug: "brakes-rear", value: "Disco sólido" },
          { categorySlug: "warranty-total", value: "3 anos" },
          { categorySlug: "wheels", value: 'Liga leve 16"' },
          { categorySlug: "headlights", value: "Halógeno" },
          { categorySlug: "air-conditioning", value: "Manual" },
          { categorySlug: "infotainment", value: '10" touchscreen' },
          { categorySlug: "connectivity", value: "Apple CarPlay / Android Auto" },
          { categorySlug: "airbags", value: "6", numericValue: 6 },
          { categorySlug: "esc", value: "Sim" },
          { categorySlug: "tcs", value: "Sim" },
          { categorySlug: "hill-assist", value: "Sim" },
        ],
      },
    ],
  },
  {
    brandSlug: "toyota",
    name: "Corolla",
    slug: "corolla",
    category: "sedan",
    sizeCategory: "médio",
    modelYears: [
      {
        year: 2025,
        fuelType: "hybrid",
        fipeCode: "002182-2",
        isZeroKm: true,
        priceFipe: "195328",
        specs: [
          { categorySlug: "engine-type", value: "1.8 16V Híbrido" },
          { categorySlug: "cylinders", value: "4", numericValue: 4 },
          { categorySlug: "valves", value: "16", numericValue: 16 },
          { categorySlug: "displacement", value: "1.798 cc", numericValue: 1798 },
          { categorySlug: "power", value: "122 cv (combinado)", numericValue: 122 },
          { categorySlug: "torque", value: "14.5 kgfm", numericValue: 14.5 },
          { categorySlug: "injection", value: "Multiponto" },
          { categorySlug: "ignition", value: "Eletrônica" },
          { categorySlug: "fuel-type", value: "Híbrido" },
          { categorySlug: "top-speed", value: "180 km/h", numericValue: 180 },
          { categorySlug: "acceleration-0-100", value: "11.5 s", numericValue: 11.5 },
          { categorySlug: "transmission-type", value: "CVT" },
          { categorySlug: "gears", value: "10 (simuladas)", numericValue: 10 },
          { categorySlug: "traction", value: "Dianteira" },
          { categorySlug: "weight", value: "1.430 kg", numericValue: 1430 },
          { categorySlug: "steering-type", value: "Elétrica" },
          { categorySlug: "length", value: "4.630 mm", numericValue: 4630 },
          { categorySlug: "width", value: "1.780 mm", numericValue: 1780 },
          { categorySlug: "height", value: "1.435 mm", numericValue: 1435 },
          { categorySlug: "wheelbase", value: "2.700 mm", numericValue: 2700 },
          { categorySlug: "trunk", value: "470 L", numericValue: 470 },
          { categorySlug: "fuel-tank", value: "43 L", numericValue: 43 },
          { categorySlug: "consumption-city-gasoline", value: "18.4 km/l", numericValue: 18.4 },
          { categorySlug: "consumption-highway-gasoline", value: "16.2 km/l", numericValue: 16.2 },
          { categorySlug: "suspension-front", value: "McPherson" },
          { categorySlug: "suspension-rear", value: "Independente multi-link" },
          { categorySlug: "brakes-front", value: "Disco ventilado" },
          { categorySlug: "brakes-rear", value: "Disco sólido" },
          { categorySlug: "warranty-total", value: "3 anos + 5 anos (bateria híbrida)" },
          { categorySlug: "wheels", value: 'Liga leve 16"' },
          { categorySlug: "headlights", value: "LED" },
          { categorySlug: "air-conditioning", value: "Automático digital dual-zone" },
          { categorySlug: "infotainment", value: '10.5" touchscreen' },
          { categorySlug: "connectivity", value: "Apple CarPlay / Android Auto sem fio" },
          { categorySlug: "airbags", value: "7", numericValue: 7 },
          { categorySlug: "esc", value: "Sim" },
          { categorySlug: "tcs", value: "Sim" },
          { categorySlug: "hill-assist", value: "Sim" },
        ],
      },
    ],
  },
  {
    brandSlug: "fiat",
    name: "Strada",
    slug: "strada",
    category: "pickup",
    sizeCategory: "picape-compacta",
    modelYears: [
      {
        year: 2025,
        fuelType: "flex",
        fipeCode: "005827-1",
        isZeroKm: true,
        priceFipe: "128990",
        specs: [
          { categorySlug: "engine-type", value: "1.3 Firefly Turbo Flex" },
          { categorySlug: "cylinders", value: "4", numericValue: 4 },
          { categorySlug: "valves", value: "16", numericValue: 16 },
          { categorySlug: "displacement", value: "1.332 cc", numericValue: 1332 },
          { categorySlug: "power", value: "132 cv", numericValue: 132 },
          { categorySlug: "torque", value: "20.4 kgfm", numericValue: 20.4 },
          { categorySlug: "fuel-type", value: "Flex" },
          { categorySlug: "transmission-type", value: "Automática" },
          { categorySlug: "gears", value: "6", numericValue: 6 },
          { categorySlug: "traction", value: "Dianteira" },
          { categorySlug: "weight", value: "1.222 kg", numericValue: 1222 },
          { categorySlug: "trunk", value: "844 L (caçamba)", numericValue: 844 },
          { categorySlug: "fuel-tank", value: "55 L", numericValue: 55 },
          { categorySlug: "warranty-total", value: "3 anos" },
          { categorySlug: "airbags", value: "6", numericValue: 6 },
          { categorySlug: "esc", value: "Sim" },
          { categorySlug: "tcs", value: "Sim" },
        ],
      },
    ],
  },
];

export const seedVehicleCategories: { name: string; slug: string; icon: string | null; displayOrder: number }[] = [
  { name: "Hatch", slug: "hatch", icon: "car-front", displayOrder: 1 },
  { name: "Sedan", slug: "sedan", icon: "car-front", displayOrder: 2 },
  { name: "SUV", slug: "suv", icon: "car-front", displayOrder: 3 },
  { name: "Picape", slug: "pickup", icon: "truck", displayOrder: 4 },
  { name: "Minivan", slug: "mpv", icon: "car-front", displayOrder: 5 },
  { name: "Coupé", slug: "coupe", icon: "car-front", displayOrder: 6 },
  { name: "Conversível", slug: "convertible", icon: "car-front", displayOrder: 7 },
  { name: "Perua", slug: "wagon", icon: "car-front", displayOrder: 8 },
  { name: "Van", slug: "van", icon: "truck", displayOrder: 9 },
  { name: "Elétrico", slug: "ev", icon: "zap", displayOrder: 10 },
];

export const seedSpecGroups: { name: string; slug: string; displayOrder: number }[] = [
  { name: "Preço", slug: "price", displayOrder: 1 },
  { name: "Motor", slug: "engine", displayOrder: 2 },
  { name: "Transmissão", slug: "transmission", displayOrder: 3 },
  { name: "Peso", slug: "weight", displayOrder: 4 },
  { name: "Direção", slug: "steering", displayOrder: 5 },
  { name: "Dimensões", slug: "dimensions", displayOrder: 6 },
  { name: "Consumo", slug: "consumption", displayOrder: 7 },
  { name: "Suspensão", slug: "suspension", displayOrder: 8 },
  { name: "Freios", slug: "brakes", displayOrder: 9 },
  { name: "Garantia", slug: "warranty", displayOrder: 10 },
  { name: "Acessórios", slug: "accessories", displayOrder: 11 },
  { name: "Conforto e Tecnologia", slug: "comfort_technology", displayOrder: 12 },
  { name: "Segurança", slug: "safety", displayOrder: 13 },
  { name: "Vendas", slug: "sales", displayOrder: 14 },
];
