/**
 * The home for cross-cutting types — shapes shared across components, stores and
 * API routes. Import from `@/types`.
 *
 * Rule of thumb for where a type belongs:
 *   • Used across layers / features        → here (`types/`).
 *   • Owned by one module (a lib, a store) → colocate it in that module, e.g.
 *     `lib/music/types.ts`, `lib/track-filters.ts`, `store/useUserStore.ts`.
 *   • Never `export` a shared type from a component file — put it here instead.
 */
export * from "./spotify";
export * from "./state";
export * from "./playlist";
