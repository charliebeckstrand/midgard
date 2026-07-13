// The resolved knobs synthesis reads, and the merge that produces them:
// built-in defaults, overlaid by a doc's front-matter `usage` block, overlaid
// by the visitor's URL params. Two layers, one direction — the visitor always
// wins, the author sets the baseline, the engine has a sane default.

import type { UsageAuthorConfig } from '../contracts'
import type { Domain } from './vocab'

/** Synthesis richness; drives how many optional props and how much data appear. */
export type Complexity = 'minimal' | 'typical' | 'rich'

/** The fully-resolved configuration a synthesis run consumes. */
export type UsageConfig = {
	complexity: Complexity
	domain: Domain
	include: string[]
	exclude: string[]
	wrap: string[]
}

/** Per-complexity synthesis knobs. */
export type Knobs = {
	/** Probability an eligible optional prop is set. */
	optionalChance: number

	/** Length of a synthesized array value. */
	arrayLength: number
}

/**
 * `minimal` sets required props only; `rich` sets nearly everything with the
 * longest sample data. The chances are ordered so inclusion is monotonic —
 * `minimal ⊆ typical ⊆ rich` for a fixed seed (see `synth.ts`).
 */
export const KNOBS: Record<Complexity, Knobs> = {
	minimal: { optionalChance: 0, arrayLength: 1 },
	typical: { optionalChance: 0.5, arrayLength: 3 },
	rich: { optionalChance: 0.9, arrayLength: 5 },
}

const COMPLEXITIES: readonly Complexity[] = ['minimal', 'typical', 'rich']

const DOMAINS: readonly Domain[] = ['generic', 'people', 'commerce', 'geo']

/**
 * Merge the author's front-matter `usage` block with the visitor's URL params
 * (`level`, `domain`) into a resolved config. Unknown or absent values fall
 * back through author → engine default; the visitor layer only overrides what
 * it actually names.
 */
export function resolveConfig(
	author: UsageAuthorConfig | undefined,
	params?: URLSearchParams,
): UsageConfig {
	const level = params?.get('level')

	const paramDomain = params?.get('domain')

	return {
		complexity: oneOf(level, COMPLEXITIES) ?? author?.complexity ?? 'typical',
		domain: oneOf(paramDomain, DOMAINS) ?? author?.domain ?? 'generic',
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
