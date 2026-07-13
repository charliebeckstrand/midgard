// Public entry: the extractor factory plus the frozen wire contract. The
// `typescript` dependency stays behind this boundary — consumers only ever
// see JSON matching the schema shapes.

export type { ApiExtractor, ExtractorOptions, ExtraDefaults } from './extractor'
export { createExtractor } from './extractor'
export * from './schema'
