// @vitest-environment node

import { __unstable__loadDesignSystem, compile } from '@tailwindcss/node'
import clsx, { type ClassValue } from 'clsx'
import { beforeAll, describe, expect, it } from 'vitest'
import { twMerge } from '../../core/tw-merge'
import { k as dialog } from '../../recipes/kata/dialog'
import { k as events } from '../../recipes/kata/events'
import { k as offcanvas } from '../../recipes/kata/offcanvas'
import { k as queryBuilder } from '../../recipes/kata/query-builder'
import { k as sheet } from '../../recipes/kata/sheet'
import { k as sidebarLayout } from '../../recipes/kata/sidebar-layout'
import { k as stepper } from '../../recipes/kata/stepper'
import { k as toast } from '../../recipes/kata/toast'
import { BREAKPOINT_WIDTHS, type MinBreakpoint, resolveVariant } from '../../types/responsive'
import { noop } from '../../utilities/noop'
import { uiRoot } from '../helpers/walk-source'

// A responsive variant axis of a component gives the classes of one value at
// each breakpoint (`resolveVariant`). A larger breakpoint must replace each
// property that a smaller one sets, or a property of the smaller value stays in
// force. So each value of an axis writes the same properties on the same
// selectors, in the same layer. Each prefixed class must also have CSS from the
// `@source inline(...)` lines of `ui/tailwind.css`, because the scanner does not
// see a class that a resolver makes at run time.

const ENTRY = `@import 'tailwindcss';\n@import './tailwind.css';`

/** The kata modules, by file. */
const modules = import.meta.glob<Record<string, unknown>>('../../recipes/kata/*.ts', {
	eager: true,
})

/** A unit, as this test reads it: the resolved config of each slot and its responsive axes. */
type UnitLike = {
	config: {
		responsive: readonly string[]
		slots: Record<string, { variants: Record<string, Record<string, ClassValue>> }>
	}
}

function isUnit(value: unknown): value is UnitLike {
	return (
		typeof value === 'function' &&
		'config' in value &&
		Array.isArray((value.config as { responsive?: unknown }).responsive)
	)
}

/**
 * Each responsive axis of each slot of each unit, and of each unit that a
 * kata holds as an extra. A unit names its responsive axes, so this list
 * needs no entry by hand.
 */
function unitAxes(): [string, Record<string, string>][] {
	const axes: [string, Record<string, string>][] = []

	const read = (name: string, unit: UnitLike) => {
		for (const axis of unit.config.responsive) {
			for (const [slot, config] of Object.entries(unit.config.slots)) {
				const values = config.variants[axis]

				if (values === undefined) continue

				const table = Object.fromEntries(
					Object.entries(values).map(([value, classes]) => [value, twMerge(clsx(classes))]),
				)

				axes.push([`${name} ${slot} ${axis}`, table])
			}
		}
	}

	for (const [file, exports] of Object.entries(modules)) {
		const name = file.replace(/^.*\/(.*)\.ts$/, '$1')

		for (const value of Object.values(exports)) {
			if (!isUnit(value)) continue

			read(name, value)

			for (const [key, extra] of Object.entries(value)) {
				if (isUnit(extra)) read(`${name} ${key}`, extra)
			}
		}
	}

	return axes
}

/** Each responsive variant axis of a component: its name and its table of classes. */
const AXES: ReadonlyArray<readonly [string, Record<string, string>]> = [
	...unitAxes(),
	['Stepper row orientation', stepper.base.orientation],
	['Stepper step orientation', stepper.step.orientation],
	['Stepper item orientation', stepper.item.orientation],
	['Stepper title orientation', stepper.title.orientation],
	['Stepper separator orientation', stepper.separator.orientation],
	['Stepper content orientation', stepper.content.orientation],
	['Dialog box align', dialog.align.box],
	['Dialog panel align', dialog.align.panel],
	['Toast viewport position', toast.position.viewport],
	['Toast stack position', toast.position.scroll],
	['Sheet right layout', sheet.layout.side.right],
	['Sheet left layout', sheet.layout.side.left],
	['Sheet top layout', sheet.layout.side.top],
	['Sheet bottom layout', sheet.layout.side.bottom],
	['Sheet fit width layout', sheet.layout.width.fit],
	['Sheet full width layout', sheet.layout.width.full],
	['QueryBuilder parts orientation', queryBuilder.parts.base],
	['QueryBuilder part orientation', queryBuilder.parts.item],
	['QueryBuilder range orientation', queryBuilder.parts.range],
	['Offcanvas drawer-only block', offcanvas.drawer.block],
	['Offcanvas inline-only block', offcanvas.inline.block],
	['Offcanvas inline-only flex', offcanvas.inline.flex],
	['Offcanvas inline-only inline flex', offcanvas.inline.inlineFlex],
	['SidebarLayout root layout', sidebarLayout.layout.base],
	['SidebarLayout peek layout', sidebarLayout.layout.peek],
	['SidebarLayout content wrapper layout', sidebarLayout.layout.wrapper],
	['SidebarLayout content layout', sidebarLayout.layout.content],
	['SidebarLayout sticky header layout', sidebarLayout.layout.stickyHeader],
	['SidebarLayout header layout', sidebarLayout.layout.header],
	['EventsButton layout', events.button],
]

const MIN_BREAKPOINTS = Object.keys(BREAKPOINT_WIDTHS) as MinBreakpoint[]

/**
 * The declarations of the CSS of one class, as `context|property`. The context
 * is each nested selector and layer around the declaration, so `&>dt` in the
 * layer `density` differs from `&>dt` in no nested layer. The first line is the
 * selector of the class itself, and it is not part of the context.
 */
function declarations(css: string): string[] {
	const context: string[] = []

	const keys: string[] = []

	for (const line of css.split('\n').slice(1)) {
		const text = line.trim()

		if (text.endsWith('{')) context.push(text.slice(0, -1).trim())
		else if (text === '}') context.pop()
		else if (text.includes(':'))
			keys.push(`${context.join(' ')}|${text.slice(0, text.indexOf(':'))}`)
	}

	return keys
}

describe('the responsive variant axes of the components', () => {
	let system: Awaited<ReturnType<typeof __unstable__loadDesignSystem>>

	let compiler: Awaited<ReturnType<typeof compile>>

	// One design system and one compiler serve each axis.
	beforeAll(async () => {
		;[system, compiler] = await Promise.all([
			__unstable__loadDesignSystem(ENTRY, { base: uiRoot }),
			compile(ENTRY, { base: uiRoot, onDependency: noop }),
		])
	})

	it.each(AXES)('%s writes the same properties in each value', (_name, table) => {
		const shape = (classes: string) =>
			system
				.candidatesToCss(classes.split(' '))
				.flatMap((css) => (css === null ? ['no CSS'] : declarations(css)))
				.sort()

		const [first, ...rest] = Object.values(table).map(shape)

		for (const value of rest) expect(value).toEqual(first)
	})

	it.each(AXES)('%s has CSS for each prefixed class from ui/tailwind.css alone', (_name, table) => {
		const classes = MIN_BREAKPOINTS.flatMap((breakpoint) =>
			Object.keys(table).flatMap((value) =>
				resolveVariant({ [breakpoint]: value }, table).split(' '),
			),
		)

		// The build with no candidates has only the inline classes. A class that
		// is not one of them adds CSS.
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
