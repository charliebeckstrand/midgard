/**
 * The group that each bench file of both suites registers its benches in.
 *
 * Since Vitest 5, a bench is a fixture of a test, and a test runs the benches
 * that it registers. {@link compareBenches} makes one test for each group. The
 * test records each bench that the group registers, then runs them in order and
 * prints them in one table. The harness functions take the `bench` of the group
 * as their first argument, so they register into the same table.
 */

import {
	type Bench,
	type BenchFn,
	type BenchFnOptions,
	type BenchRegistration,
	type BenchRunOptions,
	test,
} from 'vitest'

/**
 * The sample window of a bench, as Vitest 4 set it. tinybench 6, the engine of
 * Vitest 5, takes at least 64 samples by default, and a mount bench of a large
 * grid then runs for minutes and passes the time limit of its test. This window
 * also keeps new figures comparable with the figures that the READMEs record.
 */
const WINDOW: BenchRunOptions = { time: 500, iterations: 10, warmupTime: 100, warmupIterations: 5 }

/**
 * Registers one test named `name`. The test runs `body`, then runs each bench
 * that `body` registered, and compares them.
 *
 * @param body - Registers the benches of the group through the `bench` that it
 * gets. It runs when the test starts, not when the file loads.
 * @param options - The sample window of each bench in the group, such as
 * `time`. A field that it does not set comes from {@link WINDOW}.
 */
export function compareBenches(
	name: string,
	body: (bench: Bench) => void | Promise<void>,
	options?: BenchRunOptions,
): void {
	// The test runs each bench of the group, so its time is the sum of their
	// windows, and a group of large mounts passes the time limit of a test. Vitest
	// 4 put no limit on a bench, so the group gets none.
	test(name, { timeout: 0 }, async ({ bench }) => {
		const registered: BenchRegistration<string>[] = []

		function record(name: string, fn: BenchFn): BenchRegistration<string>

		function record(name: string, fnOptions: BenchFnOptions, fn: BenchFn): BenchRegistration<string>

		function record(name: string, second: BenchFn | BenchFnOptions, third?: BenchFn) {
			const registration =
				third === undefined
					? bench(name, second as BenchFn)
					: bench(name, second as BenchFnOptions, third)

			registered.push(registration)

			return registration
		}

		await body(Object.assign(record, { compare: bench.compare, from: bench.from }))

		const [first, ...rest] = registered

		if (!first) throw new Error(`The group "${name}" registers no bench.`)

		const window = { ...WINDOW, ...options }

		if (rest.length === 0) await first.run(window)
		else await bench.compare(first, ...rest, window)
	})
}
