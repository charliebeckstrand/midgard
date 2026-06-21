/**
 * The keys parsed from a demo's `export const meta`. Single source for both the
 * meta type and the build-time key filter: `parseMeta` keeps only these keys
 * with string-literal values, and {@link DemoMeta} is their shape.
 */
export const META_KEYS = ['name'] as const

/** A demo's optional build-time metadata, keyed by {@link META_KEYS}. */
export type DemoMeta = Partial<Record<(typeof META_KEYS)[number], string>>
