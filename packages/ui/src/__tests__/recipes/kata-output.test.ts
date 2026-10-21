// @vitest-environment node
import clsx, { type ClassValue } from 'clsx'
import { describe, expect, it } from 'vitest'
import { twMerge } from '../../core/tw-merge'

// The output gate of the recipe migration. It resolves each part of each kata
// for each combination of its axes, and it compares the class sets with the
// snapshot that main gave. A migration of a kata to a new shape must keep the
// classes of each part, so a change to the snapshot is a change of the output.
//
// The gate reads a part in the same way for each shape of kata. The path of a
// part is its key path under the export. A recipe that returns parts gives
// `k.<part>` for each part, the same path as a static slot or a sibling recipe
// of the old shape. An axis that does not change the classes of a part is not
// in the key of that part. Thus a part keeps its key when a kata merges its
// recipes into one recipe with more axes.
//
// This gate is temporary. Delete it when the recipe migration ends.

/** The kata modules, by file. */
const modules = import.meta.glob<Record<string, unknown>>('../../recipes/kata/*.ts', {
	eager: true,
})

/**
 * The parts that a migration renamed, from the new path to the path on main. The
 * root part of a recipe with parts is `base`, so the part that was the root
 * recipe of a kata takes that name.
 */
const RENAMES: Record<string, string> = {
	'tabs.k.base': 'tabs.k.group',
	'tabs.k.base()': 'tabs.k.group()',
}

/** The limit of the combinations of one recipe. A larger recipe varies one axis at a time. */
const COMBINATION_CAP = 4096

/** A recipe of the engine: a callable with its resolved config. */
type RecipeLike = ((props?: Record<string, string>) => unknown) & {
	config: { variants: Record<string, Record<string, unknown>> }
}

/** The classes of a class value, merged as `cn` merges them, in sorted order. */
function classes(value: unknown): string {
	return twMerge(clsx(value as ClassValue))
		.split(/\s+/)
		.filter(Boolean)
		.sort()
		.join(' ')
}

/** True when the value is a class list: a string, or an array of class lists. */
function isClassList(value: unknown): boolean {
	if (typeof value === 'string') return true

	if (value === null || value === undefined || value === false) return true

	return Array.isArray(value) && value.every(isClassList)
}

function isRecipe(value: unknown): value is RecipeLike {
	return typeof value === 'function' && 'config' in value
}

/** Each combination of the axis values, or one axis at a time when the product is too large. */
function combinations(axes: [string, string[]][]): Record<string, string>[] {
	const product = axes.reduce((count, [, values]) => count * values.length, 1)

	if (product > COMBINATION_CAP) {
		return axes.flatMap(([axis, values]) => values.map((value) => ({ [axis]: value })))
	}

	return axes.reduce<Record<string, string>[]>(
		(rows, [axis, values]) =>
			rows.flatMap((row) => values.map((value) => ({ ...row, [axis]: value }))),
		[{}],
	)
}

function comboKey(combo: Record<string, string>, axes: string[]): string {
	return axes.map((axis) => `${axis}=${combo[axis]}`).join(',')
}

/**
 * Removes the axes that do not change the output. An axis does not change the
 * output when each two combinations that differ only in that axis give the same
 * classes.
 */
function reduce(
	rows: { combo: Record<string, string>; out: string }[],
	axes: string[],
): Record<string, string> | string {
	const keep = axes.filter((axis) => {
		const others = axes.filter((name) => name !== axis)

		const seen = new Map<string, string>()

		for (const { combo, out } of rows) {
			const key = comboKey(combo, others)

			const prior = seen.get(key)

			if (prior !== undefined && prior !== out) return true

			seen.set(key, out)
		}

		return false
	})

	const table: Record<string, string> = {}

	for (const { combo, out } of rows) table[comboKey(combo, keep)] = out

	const values = Object.values(table)

	return keep.length === 0 && values.length === 1 ? (values[0] as string) : table
}

function walk(value: unknown, path: string, out: Record<string, unknown>): void {
	if (isRecipe(value)) {
		const axes = Object.entries(value.config.variants).map(
			([axis, map]) => [axis, Object.keys(map).sort()] as [string, string[]],
		)

		const names = axes.map(([axis]) => axis)

		const results = combinations(axes).map((combo) => ({ combo, result: value(combo) }))

		const defaults = value()

		const parts =
			typeof defaults === 'object' && defaults !== null
				? Object.keys(defaults as Record<string, unknown>).map(
						(part) => [part, `${path}.${part}`] as const,
					)
				: [[undefined, path] as const]

		for (const [part, partPath] of parts) {
			const pick = (result: unknown) =>
				classes(part === undefined ? result : (result as Record<string, unknown>)[part])

			const reduced = reduce(
				results.map(({ combo, result }) => ({ combo, out: pick(result) })),
				names,
			)

			out[partPath] = reduced

			// A part with axes also records the classes of a call with no props, which
			// hold its defaults.
			if (typeof reduced !== 'string') out[`${partPath}()`] = pick(defaults)
		}

		for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`, out)

		return
	}

	if (typeof value === 'function') {
		out[path] = 'function'

		return
	}

	if (isClassList(value)) {
		out[path] = classes(value)

		return
	}

	if (typeof value !== 'object') {
		out[path] = String(value)

		return
	}

	for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
		walk(child, `${path}.${key}`, out)
	}
}

describe('kata output', () => {
	it('keeps the classes of each kata part', async () => {
		const out: Record<string, unknown> = {}

		for (const [file, exports] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
			const name = file.replace(/^.*\/(.*)\.ts$/, '$1')

			for (const [key, value] of Object.entries(exports)) walk(value, `${name}.${key}`, out)
		}

		const sorted = Object.fromEntries(
			Object.entries(out)
				.map(([path, value]) => [RENAMES[path] ?? path, value] as const)
				.sort(([a], [b]) => a.localeCompare(b)),
		)

		await expect(`${JSON.stringify(sorted, null, '\t')}\n`).toMatchFileSnapshot(
			'./__snapshots__/kata-output.json',
		)
	})
})
