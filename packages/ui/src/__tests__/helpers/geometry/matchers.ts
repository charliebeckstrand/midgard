import type { MatcherResult } from 'vitest'
import {
	type BoxSource,
	boxOf,
	describeSource,
	EDGES,
	type EdgeValues,
	edgeDelta,
	formatBox,
	formatLength,
	isBoxSource,
	overhang,
} from './box'

/** The options of a box matcher. */
export type BoxMatchOptions = {
	/**
	 * The distance by which each edge can miss. Give a named value from
	 * `tolerance.ts`, or a constant beside the case with its reason.
	 *
	 * @defaultValue `0`
	 */
	tolerance?: number
}

type GeometryMatchers<R = unknown> = {
	/**
	 * Asserts that each edge of the received box holds the box of `inner`, to
	 * within `tolerance`. A failure names each edge that `inner` extends past.
	 */
	toContainBox: (inner: BoxSource, options?: BoxMatchOptions) => R

	/**
	 * Asserts that each edge of the received box is within `tolerance` of the
	 * same edge of `expected`. A failure names each edge that misses.
	 */
	toMatchBox: (expected: BoxSource, options?: BoxMatchOptions) => R

	/**
	 * Asserts that the received number is within `tolerance` of `expected`. The
	 * tolerance is absolute and has no default, unlike the decimal digits of
	 * `toBeCloseTo`.
	 */
	toBeNear: (expected: number, tolerance: number) => R
}

declare module 'vitest' {
	interface Matchers<T> extends GeometryMatchers<T> {}
}

function sourceOf(value: unknown, role: string): BoxSource {
	if (!isBoxSource(value)) {
		throw new TypeError(
			`expected ${role} to be an element or a box with numeric left, top, right, and bottom`,
		)
	}

	return value
}

function toleranceOf(options: BoxMatchOptions | undefined): number {
	const tolerance = options?.tolerance ?? 0

	if (!(tolerance >= 0)) {
		throw new RangeError(`expected a tolerance of zero or more, received ${tolerance}`)
	}

	return tolerance
}

/** Lists the edges whose value is past `tolerance`, as `edge by n`. */
function misses(values: EdgeValues, tolerance: number, magnitude: (n: number) => number): string {
	return EDGES.filter((edge) => magnitude(values[edge]) > tolerance)
		.map((edge) => `${edge} by ${formatLength(values[edge])}`)
		.join(', ')
}

function toContainBox(received: unknown, inner: unknown, options?: BoxMatchOptions): MatcherResult {
	const outerSource = sourceOf(received, 'the received value')
	const innerSource = sourceOf(inner, 'the inner box')
	const tolerance = toleranceOf(options)

	const outer = boxOf(outerSource)
	const box = boxOf(innerSource)
	const past = overhang(box, outer)

	const pass = EDGES.every((edge) => past[edge] <= tolerance)

	const subject = `${describeSource(outerSource)} ${formatBox(outer)}`
	const object = `${describeSource(innerSource)} ${formatBox(box)}`

	return {
		pass,
		message: () =>
			pass
				? `expected ${subject} not to contain ${object} within ${formatLength(tolerance)}`
				: `expected ${subject} to contain ${object} within ${formatLength(tolerance)}; it extends past ${misses(past, tolerance, (n) => n)}`,
	}
}

function toMatchBox(
	received: unknown,
	expected: unknown,
	options?: BoxMatchOptions,
): MatcherResult {
	const actualSource = sourceOf(received, 'the received value')
	const expectedSource = sourceOf(expected, 'the expected box')
	const tolerance = toleranceOf(options)

	const actual = boxOf(actualSource)
	const target = boxOf(expectedSource)
	const delta = edgeDelta(actual, target)

	const pass = EDGES.every((edge) => Math.abs(delta[edge]) <= tolerance)

	const subject = `${describeSource(actualSource)} ${formatBox(actual)}`
	const object = `${describeSource(expectedSource)} ${formatBox(target)}`

	return {
		pass,
		message: () =>
			pass
				? `expected ${subject} not to match ${object} within ${formatLength(tolerance)}`
				: `expected ${subject} to match ${object} within ${formatLength(tolerance)}; it misses at ${misses(delta, tolerance, Math.abs)}`,
		actual,
		expected: target,
	}
}

function toBeNear(received: unknown, expected: number, tolerance: number): MatcherResult {
	if (typeof received !== 'number') {
		throw new TypeError(`expected a number, received ${typeof received}`)
	}

	if (!(tolerance >= 0)) {
		throw new RangeError(`expected a tolerance of zero or more, received ${tolerance}`)
	}

	const delta = received - expected

	// A NaN fails. Two equal infinities pass, although their difference is NaN.
	const pass = received === expected || Math.abs(delta) <= tolerance

	return {
		pass,
		message: () =>
			`expected ${formatLength(received)} ${pass ? 'not ' : ''}to be within ${formatLength(tolerance)} of ${formatLength(expected)}; the difference is ${formatLength(delta)}`,
		actual: received,
		expected,
	}
}

/**
 * The geometry matchers. `setup/geometry.ts` gives them to `expect` in each
 * project that runs the `ui` tests.
 */
export const geometryMatchers = { toContainBox, toMatchBox, toBeNear }
