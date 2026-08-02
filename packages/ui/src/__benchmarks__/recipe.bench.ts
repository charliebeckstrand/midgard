// @vitest-environment node

import clsx from 'clsx'
import { bench, describe } from 'vitest'
import { cn } from '../core/cn'
import { defineRecipe } from '../core/recipe'
import { twMerge } from '../core/tw-merge'
import { k as button } from '../recipes/kata/button'

/**
 * The style resolution every component render pays, benched with no DOM and no
 * React. A recipe call and a `cn` merge run once per styled element — the most
 * frequently executed code in the package by orders of magnitude — so a
 * constant-factor change here moves every mount number in every other bench,
 * and none of those can isolate it.
 *
 * Three costs are separated because they behave differently. A **memo hit** is
 * what a render normally pays: join the resolved values of every relevant key
 * into a string, then read a Map — so it scales with the recipe's *axis count*,
 * not with its class payload. A **memo miss** composes the class list and runs
 * it through `clsx` + `tailwind-merge`, which is one to two orders of magnitude
 * dearer and scales with the payload. **`cn`** is the unmemoized merge a call
 * site adds on top of the recipe's output, once per element, every render — the
 * one part of the path no cache covers.
 *
 * `Button` stands in for a real kata throughout: three axes, an eight-colour
 * palette, four compound rules, and a base of a dozen classes.
 */

// The five class sets a mid-sized component merges per element: the recipe's
// output, a layout class, a state class, a caller override.
const CALLER = 'w-full shrink-0'

const STATE = 'data-[pending]:opacity-50'

const OVERRIDE = 'px-6 text-sm'

describe('recipe · call (memo hit — the render path)', () => {
	// What a mounted component actually runs per element. No props is the
	// commonest call and resolves to a precomputed key, so it skips the join
	// entirely; the explicit calls pay it.
	bench('button · defaults (precomputed key)', () => {
		button()
	})

	bench('button · one axis set', () => {
		button({ size: 'sm' })
	})

	bench('button · all three axes set', () => {
		button({ variant: 'outline', color: 'blue', size: 'lg' })
	})
})

describe('recipe · memo hit vs miss (same recipe, same payload)', () => {
	// One recipe whose single axis carries more values than the memo's 1,024-entry
	// cap, called two ways: a fixed value that always hits, and a cycling value
	// that never does (and pays the cap's clear every 1,024th call). Same recipe
	// and same class payload on both bars, so the ratio is exactly what the memo
	// buys. Synthetic because no real kata declares enough combinations to defeat
	// the memo — the point is the cost of the branch, not that a component takes
	// it.
	const WIDE = 2_048

	const wide = defineRecipe({
		base: 'relative isolate inline-flex w-fit shrink-0 font-semibold',
		slot: Object.fromEntries(
			Array.from({ length: WIDE }, (_, index) => [`v${index}`, `px-${index % 12} py-2`]),
		),
		defaults: { slot: 'v0' },
	})

	// The axis is built from `Object.fromEntries`, so its type carries an index
	// signature — which the engine's `AxesOf` mapped type deliberately refuses to
	// widen into a variant union (see `engine/applicator.ts`). A kata always
	// declares its values as literals; only a generated axis like this one needs
	// the call signature spelled out.
	const call = wide as unknown as (props: { slot: string }) => string

	let index = 0

	bench('fixed value · every call a hit', () => {
		call({ slot: 'v7' })
	})

	bench('cycling value · every call a miss', () => {
		index = (index + 1) % WIDE

		call({ slot: `v${index}` })
	})
})

describe('recipe · compose (twMerge ∘ clsx, what a miss runs)', () => {
	// The merge itself, without the key join or the Map write, over two payload
	// sizes: a leaf's handful of classes against the fifty-odd a real kata's
	// base + variant + size resolves to. `tailwind-merge` scans every class for
	// conflicts, so this scales with the payload — which is why the memo above
	// matters more for a heavy kata than for a light one.
	const resolved = button.config

	const light = ['inline-flex', 'p-2', 'rounded-md']

	const heavy = [resolved.base, resolved.variants.variant?.outline, resolved.variants.size?.lg]

	bench('3 classes', () => {
		twMerge(clsx(light))
	})

	bench('button base + variant + size', () => {
		twMerge(clsx(heavy))
	})
})

describe('recipe · cn (unmemoized, once per element per render)', () => {
	// The recipe's output is cached; the `cn` that merges it with the call site's
	// own classes is not. Every rung is a real call shape: a leaf with nothing but
	// the recipe, a leaf with a caller override, a composite folding in state and
	// layout.
	const recipeOutput = button({ variant: 'solid', color: 'zinc', size: 'md' })

	bench('recipe output only', () => {
		cn(recipeOutput)
	})

	bench('recipe + caller className', () => {
		cn(recipeOutput, CALLER)
	})

	bench('recipe + state + layout + override (conflicting)', () => {
		cn(recipeOutput, STATE, CALLER, OVERRIDE)
	})

	// The conditional form a component writes when a flag drives a class. `clsx`
	// must walk and drop the falsy entries before the merge sees them.
	bench('conditional entries · half falsy', () => {
		cn(recipeOutput, false && STATE, CALLER, undefined, null, OVERRIDE)
	})
})

describe('recipe · key join (scales with axis count, not payload)', () => {
	// A memo hit costs one `resolveValue` and one string append per relevant key,
	// so a recipe's axis count — plus every key its compound rules condition on —
	// sets the floor for every render that touches it. These three hold the class
	// payload fixed and vary only that count.
	const axis = { a: 'p-1', b: 'p-2', c: 'p-3' }

	const recipeWith = (count: number) =>
		defineRecipe({
			base: 'inline-flex',
			...Object.fromEntries(Array.from({ length: count }, (_, index) => [`x${index}`, axis])),
			defaults: Object.fromEntries(Array.from({ length: count }, (_, index) => [`x${index}`, 'a'])),
		})

	for (const axes of [1, 4, 16]) {
		const recipe = recipeWith(axes)

		// One axis set explicitly, so the call cannot take the precomputed
		// no-props key and must join for real.
		bench(`${axes} axes · memo hit`, () => {
			recipe({ x0: 'b' })
		})
	}
})

describe('recipe · defineRecipe (creation, once per module load)', () => {
	// Every kata builds its recipe at import time: expand the config, splice the
	// palette into the `variant` × `color` axes, compile the plan, then merge each
	// slot's classes eagerly. A page that imports a hundred components pays this a
	// hundred times before it renders anything, so it is startup cost, not render
	// cost — measured against a bare recipe to separate the palette's share.
	const config = button.config

	bench('bare (base + one axis)', () => {
		defineRecipe({ base: 'inline-flex', size: { sm: 'p-1', md: 'p-2' }, defaults: { size: 'md' } })
	})

	bench('button-shaped (3 axes + 8-colour palette + 4 compounds)', () => {
		defineRecipe({
			base: config.base,
			variant: config.variants.variant,
			size: config.variants.size,
			color: config.variants.color,
			compound: config.compound,
			defaults: config.defaults,
		})
	})
})
