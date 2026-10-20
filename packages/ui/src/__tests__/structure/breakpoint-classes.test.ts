// @vitest-environment node

import { compile } from '@tailwindcss/node'
import { describe, expect, it } from 'vitest'
import { ma } from '../../recipes/kiso'
import { resolvePadding, resolvePx, resolvePy } from '../../structure/box/variants'
import { type ColumnCount, resolveColumns } from '../../structure/columns/variants'
import {
	type FlexAlign,
	type FlexDirection,
	type FlexJustify,
	resolveAlign,
	resolveDirection,
	resolveGap,
	resolveJustify,
} from '../../structure/flex/variants'
import { resolveTemplate, type SplitRatio } from '../../structure/split/variants'
import type { Orientation } from '../../types'
import { atBreakpoint, BREAKPOINTS, type MinBreakpoint } from '../../types/responsive'
import { noop } from '../../utilities/noop'
import { uiRoot } from '../helpers/walk-source'

// The resolvers of Box, Flex, and Split put a breakpoint prefix on a class at
// run time, so Tailwind's scanner does not find the prefixed class in the
// source. `@source inline(...)` in `ui/tailwind.css` declares each prefixed
// class. The inline lines restate the shared scale (`ma`), so a change to a
// step of the scale that does not change the lines gives a class with no CSS.

const MIN_BREAKPOINTS = BREAKPOINTS.filter(
	(breakpoint): breakpoint is MinBreakpoint => breakpoint !== 'initial',
)

/** The keys of `record`. The type of `record` makes sure that each key is there. */
function keysOf<K extends string>(record: Record<K, true>): K[] {
	return Object.keys(record) as K[]
}

const STEPS = Object.keys(ma.gap) as Array<keyof typeof ma.gap>

const DIRECTIONS = keysOf<FlexDirection>({
	row: true,
	col: true,
	'row-reverse': true,
	'col-reverse': true,
})

const ALIGNS = keysOf<FlexAlign>({
	start: true,
	center: true,
	end: true,
	stretch: true,
	baseline: true,
})

const JUSTIFIES = keysOf<FlexJustify>({
	start: true,
	center: true,
	end: true,
	between: true,
	around: true,
	evenly: true,
})

const COUNTS: ColumnCount[] = [1, 2, 3, 4, 6]

const ORIENTATIONS = keysOf<Orientation>({ horizontal: true, vertical: true })

const RATIOS = keysOf<SplitRatio>({
	'1/4': true,
	'1/3': true,
	'1/2': true,
	'2/3': true,
	'3/4': true,
})

/** Each class with a breakpoint prefix that a resolver of a structure unit can give. */
function prefixedClasses(): string[] {
	const classes = new Set<string>()

	for (const breakpoint of MIN_BREAKPOINTS) {
		const at = <T>(value: T) => ({ [breakpoint]: value })

		const resolved = [
			...STEPS.flatMap((step) => [
				...resolvePadding(at(step)),
				...resolvePx(at(step)),
				...resolvePy(at(step)),
				...resolveGap(at(step)),
			]),
			...DIRECTIONS.flatMap((direction) => resolveDirection(at(direction))),
			...ALIGNS.flatMap((align) => resolveAlign(at(align))),
			...JUSTIFIES.flatMap((justify) => resolveJustify(at(justify))),
			...COUNTS.flatMap((count) => resolveColumns(at(count))),
			// Each template also clears the template of the other axis.
			...ORIENTATIONS.flatMap((orientation) =>
				RATIOS.flatMap((ratio) => resolveTemplate(at(orientation), at(ratio))),
			),
		]

		for (const name of resolved.flatMap((value) => value.split(' '))) {
			if (name.startsWith(`${breakpoint}:`)) classes.add(name)
		}
	}

	return [...classes]
}

describe('atBreakpoint', () => {
	it('gives the classes unchanged with no breakpoint', () => {
		expect(atBreakpoint('p-2')).toBe('p-2')

		expect(atBreakpoint('p-2', 'initial')).toBe('p-2')
	})

	it('puts the prefix on each class', () => {
		expect(atBreakpoint('p-2 gap-1', 'md')).toBe('md:p-2 md:gap-1')
	})
})

describe('the breakpoint classes of the structure units', () => {
	it('each have CSS from ui/tailwind.css alone', async () => {
		const compiler = await compile(`@import 'tailwindcss';\n@import './tailwind.css';`, {
			base: uiRoot,
			onDependency: noop,
		})

		const classes = prefixedClasses()

		// A step of each axis at each breakpoint: 4 × 6 spacing, 4 + 5 + 6
		// keywords, 5 column counts, and 10 templates and the 2 clears of the other axis.
		expect(classes).toHaveLength(MIN_BREAKPOINTS.length * (24 + 15 + 5 + 12))

		// The build with no candidates has only the inline classes. A class
		// that is not one of them adds CSS.
		let css = compiler.build([])

		const missing: string[] = []

		for (const name of classes) {
			const next = compiler.build([name])

			if (next !== css) missing.push(name)

			css = next
		}

		expect(missing).toEqual([])
	})
})
