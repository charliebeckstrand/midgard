// The configuration a synthesis run consumes, resolved from a doc's front-matter
// `usage` block. There is one autonomous synthesis mode — no richness tiers —
// so the config only carries what the author steers: the vocabulary domain and
// the include / exclude / wrap lists.

import type { UsageAuthorConfig } from '../contracts'
import type { Domain } from './vocab'

/** The fully-resolved configuration a synthesis run consumes. */
export type UsageConfig = {
	domain: Domain
	include: string[]
	exclude: string[]
	wrap: string[]
}

const DOMAINS: readonly Domain[] = ['generic', 'people', 'commerce', 'geo']

/** Resolve a doc's front-matter `usage` block into the config synthesis reads. */
export function resolveConfig(author: UsageAuthorConfig | undefined): UsageConfig {
	return {
		domain: oneOf(author?.domain, DOMAINS) ?? 'generic',
		include: author?.include ?? [],
		exclude: author?.exclude ?? [],
		wrap: author?.wrap ?? [],
	}
}

/** Narrow a raw string to a member of `allowed`, or `null`. */
function oneOf<T extends string>(
	value: string | null | undefined,
	allowed: readonly T[],
): T | null {
	return value && (allowed as readonly string[]).includes(value) ? (value as T) : null
}
