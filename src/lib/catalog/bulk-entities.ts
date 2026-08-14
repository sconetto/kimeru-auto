/**
 * Client-safe constants for the bulk import/export UI. Kept free of any
 * server-only imports (DB, node:*) so they can be bundled into client
 * components without dragging Node core modules into the browser bundle.
 */

export const EXPORTABLE_ENTITIES = ["brands", "models", "model-years", "specs"] as const;
export type ExportableEntity = (typeof EXPORTABLE_ENTITIES)[number];

export const ENTITY_LABELS: Record<ExportableEntity, string> = {
  brands: "Marcas",
  models: "Modelos",
  "model-years": "Versões (model years)",
  specs: "Categorias de especificação",
};
