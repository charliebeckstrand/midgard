/**
 * Slot collapse: fold a kata's class arrays into the strings `cn` can memoise.
 *
 * `defineRecipe` collapses its `slots` once at creation, so a recipe-shaped
 * kata hands each slot to its consumer as a plain string. An object-literal
 * kata has no such step, and its arrays reach `cn` uncollapsed. `cn` branches
 * its memo on string arguments only, so an array costs a full `clsx` +
 * `tailwind-merge` pass on every element it styles. `defineSlots` gives the
 * object-literal shape the same collapse.
 *
 * A slot tree holds classes only. A kata that also carries motion configs,
 * skeleton data, or sub-recipes collapses its class subtree and leaves the
 * rest alone: the type refuses the other payloads instead of walking them.
 */

import clsx from 'clsx'

import { twMerge } from '../tw-merge'

/** A slot's class payload, as a kata authors it. */
export type SlotValue = string | readonly string[]

/** A tree of slots: class payloads at the leaves, plain maps above them. */
export type SlotTree = { readonly [slot: string]: SlotValue | SlotTree }

/**
 * `T` with every class payload collapsed to the string it merges to.
 *
 * @remarks The `[T]` brackets stop the conditional from distributing, so a
 * leaf typed as a union of class strings still collapses to one `string`.
 */
export type Collapsed<T> = [T] extends [SlotValue]
	? string
	: { readonly [K in keyof T]: Collapsed<T[K]> }

/**
 * Collapses every class payload in `tree` to one merged string and keeps the
 * tree's shape. Conflicting utilities resolve last-wins through
 * `tailwind-merge` — the rule `defineRecipe` applies to its `slots`.
 *
 * @remarks Runs once, at module load. The kata keeps the array-and-spread
 * authoring form that composes kiso tokens, and its consumer reads a string,
 * so a per-element `cn` call hits the memo.
 *
 * @param tree - Slot tree; each leaf is a class string or an array of them.
 * @returns The same shape, with each leaf merged to a string.
 */
export function defineSlots<T extends SlotTree>(tree: T): Collapsed<T> {
	const collapsed: Record<string, unknown> = {}

	for (const [slot, value] of Object.entries(tree)) {
		collapsed[slot] =
			typeof value === 'string' || Array.isArray(value)
				? twMerge(clsx(value))
				: defineSlots(value as SlotTree)
	}

	return collapsed as Collapsed<T>
}
