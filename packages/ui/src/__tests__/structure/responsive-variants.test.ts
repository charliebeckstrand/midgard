// @vitest-environment node

import { join } from 'node:path'
import { __unstable__loadDesignSystem, compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import clsx, { type ClassValue } from 'clsx'
import { beforeAll, describe, expect, it } from 'vitest'
import { twMerge } from '../../core/tw-merge'
import { noop } from '../../utilities/noop'
import { BREAKPOINT_WIDTHS, type MinBreakpoint, resolveVariant } from '../../utilities/responsive'
import { uiRoot } from '../helpers/walk-source'

// A responsive variant axis of a component gives the classes of one value at
// each breakpoint (`resolveVariant`). A larger breakpoint must replace each
// property that a smaller one sets, or a property of the smaller value stays in
// force. So each value of an axis writes the same properties on the same
// selectors, in the same layer. Each prefixed class must also have CSS from the
// `@source inline(...)` lines of `ui/tailwind.css`, because the scanner does not
// see a class that a resolver makes at run time. Each class with no prefix must
// be a literal string in the source, because the scanner finds it only there.

const ENTRY = `@import 'tailwindcss';\n@import './tailwind.css';`

/** The kata modules, by file. */
const modules = import.meta.glob<Record<string, unknown>>('../../recipes/kata/*.ts', {
	eager: true,
})

/** A unit, as this test reads it: the resolved config of each slot and its responsive axes. */
type UnitLike = {
	config: {
		responsive: readonly string[]
		slots: Record<
			string,
			{
				variants: Record<string, Record<string, ClassValue>>
				compound: ReadonlyArray<Record<string, unknown> & { class: ClassValue }>
			}
		>
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
 *
 * A value of an axis is a rule with one condition, as the engine reads it.
 * The rules that read the axis with the same other conditions are a table,
 * keyed by the value of the axis. A breakpoint replaces the classes of one
 * rule with the classes of the next.
 */
function unitAxes(): [string, Record<string, string>][] {
	const axes: [string, Record<string, string>][] = []

	const read = (name: string, unit: UnitLike) => {
		for (const axis of unit.config.responsive) {
			for (const [slot, config] of Object.entries(unit.config.slots)) {
				const groups = new Map<string, Record<string, string>>()

				const values = Object.entries(config.variants[axis] ?? {}).map(([value, classes]) => ({
					[axis]: value,
					class: classes,
				}))

				for (const { class: classes, ...conditions } of [...values, ...config.compound]) {
					if (!(axis in conditions)) continue

					const rest = Object.entries(conditions)
						.filter(([key]) => key !== axis)
						.map(([key, value]) => `${key}=${String(value)}`)
						.join(' ')

					const group = groups.get(rest) ?? {}

					group[String(conditions[axis])] = twMerge(clsx(classes))

					groups.set(rest, group)
				}

				for (const [rest, table] of groups) {
					axes.push([`${name} ${slot} ${axis}${rest === '' ? '' : ` (${rest})`}`, table])
				}
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
const AXES: ReadonlyArray<readonly [string, Record<string, string>]> = unitAxes()

const MIN_BREAKPOINTS = Object.keys(BREAKPOINT_WIDTHS) as MinBreakpoint[]

/**
 * The candidates that the scanner of an app finds in the source of `ui`. An app
 * scans `ui/src` with no tests, benchmarks, or docs (`shared/src/globals.css`).
 */
function sourceCandidates(): Set<string> {
	const src = join(uiRoot, 'src')

	const skip = ['__tests__', '__benchmarks__', 'docs'].map((name) => ({
		base: join(src, name),
		pattern: '**/*',
		negated: true,
	}))

	const scanner = new Scanner({
		sources: [{ base: src, pattern: '**/*', negated: false }, ...skip],
	})

	return new Set(scanner.scan())
}

/**
 * The declarations of the CSS of one class, as `context|property`. The context
 * is each nested selector and layer around the declaration, so `&>dt` in the
 * layer `density` differs from `&>dt` in no nested layer. The first selector
 * that is not an at-rule is the selector of the class itself. It is not part
 * of the context, because it differs for each class. An at-rule, such as the
 * layer of a density utility, can come before it.
 */
function declarations(css: string): string[] {
	// The selector of the class holds `null`, so the context skips it.
	const context: (string | null)[] = []

	const keys: string[] = []

	let classSeen = false

	for (const line of css.split('\n')) {
		const text = line.trim()

		if (text.endsWith('{')) {
			const block = text.slice(0, -1).trim()

			const isClass: boolean = !classSeen && !block.startsWith('@')

			classSeen ||= isClass

			context.push(isClass ? null : block)
		} else if (text === '}') context.pop()
		else if (text.includes(':'))
			keys.push(`${context.filter(Boolean).join(' ')}|${text.slice(0, text.indexOf(':'))}`)
	}

	return keys
}

describe('the responsive variant axes of the components', () => {
	let system: Awaited<ReturnType<typeof __unstable__loadDesignSystem>>

	let compiler: Awaited<ReturnType<typeof compile>>

	let candidates: Set<string>

	// One design system and one compiler serve each axis.
	beforeAll(async () => {
		;[system, compiler] = await Promise.all([
			__unstable__loadDesignSystem(ENTRY, { base: uiRoot }),
			compile(ENTRY, { base: uiRoot, onDependency: noop }),
		])

		candidates = sourceCandidates()
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

	it.each(AXES)('%s has each class with no prefix in the source', (_name, table) => {
		const classes = Object.keys(table).flatMap((value) => resolveVariant(value, table).split(' '))

		expect(classes.filter((name) => name !== '' && !candidates.has(name))).toEqual([])
	})
})
