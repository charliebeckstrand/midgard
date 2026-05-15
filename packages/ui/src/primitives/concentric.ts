'use client'

import { createContext } from '../core'
import type { Ma } from '../recipes/ryu/ma'
import type { Step } from '../recipes/ryu/sun'

/**
 * Universal ambient size cascade. Written by every size-broadcasting surface
 * — `<Card>`, `<Group>`, `<Drawer>`, `<Popover>`, `<Control>`, `<Input>`
 * (for its affix slot), `<Button>` (for its descendants), `<Avatar>` /
 * `<AvatarGroup>`, and `<Density>`. Innermost provider wins (standard React
 * context semantics).
 *
 * Value is `Ma` — wide enough to carry every broadcaster's natural size
 * (Step from surfaces, Size from affix / button, Ma from avatar). Consumers
 * read through {@link useResolvedSize}, which preserves their narrower type
 * via generics; out-of-range values (e.g. `'xs'` reaching a Step-typed
 * consumer) flow to the consumer's variant `defaultVariants` and render
 * as the recipe's default. See `src/docs/CASCADES.md`.
 */
export type ConcentricContextValue = {
	size: Ma
}

/**
 * Returns the active size context, or `null` outside any size-providing
 * ancestor — components reading this should treat `null` as "no contextual
 * size, use my own default".
 */
export const [ConcentricProvider, useConcentric] = createContext<ConcentricContextValue | null>(
	'Concentric',
	{ default: null },
)

/**
 * Resolve a size through the universal cascade: `explicit ?? Concentric ?? fallback`.
 * Defaults to `'md'` when nothing else resolves.
 *
 * Single hook for every size-aware component. Layered cascades (form fields
 * reading Control, Button reading AffixSize, etc.) compose at the call site
 * — `useResolvedSize(size ?? control?.size)`, `useResolvedSize(size ?? affixSize)`,
 * `useResolvedSize(size ?? buttonSize ?? affixSize)`. The hook owns the
 * Concentric leg and the `'md'` fallback so every site has one consistent
 * read.
 *
 * Generic on the caller's size type (`T`). Step-typed callers (most
 * components) get back `Step`. Wider callers (Button uses `Size`, Avatar
 * uses `Ma`) get back their own type — Concentric writes are guaranteed in
 * the `Step` subset, so the cast is safe at runtime.
 */
export function useResolvedSize<T extends Ma = Step>(explicit?: T, fallback?: T): T {
	const concentric = useConcentric()

	return explicit ?? (concentric?.size as T | undefined) ?? fallback ?? ('md' as T)
}
