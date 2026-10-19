import { beforeEach, onTestFinished } from 'vitest'

/**
 * Fails a test that writes to `console.error` or `console.warn` and does not
 * expect it.
 *
 * React writes there when a state update lands outside `act`, when the markup
 * is not valid, or when a prop has a value that it rejects. The components of
 * ui write there when a consumer gives them a bad configuration. Each of these
 * is a defect of the test or of the code under test. A run that only logs it
 * passes, and nobody reads the log.
 *
 * A test that expects the message spies on the method
 * (`vi.spyOn(console, 'warn')`) and asserts the call. The spy replaces the
 * guard for that test. The restore after the test (`restore-test-state.ts`)
 * puts the guard back before `cleanup`.
 *
 * The check runs in `onTestFinished`, after each `afterEach`. Thus a message
 * that the unmount of `cleanup` causes fails the test that rendered the tree.
 * A test that failed already is not failed again: the message stays in the
 * log, next to the failure.
 */

const levels = ['error', 'warn'] as const

const messages: string[] = []

/** Marks a console method that already carries the guard. */
const GUARDED = Symbol.for('midgard.console-guard')

/** One argument of a console call, as text. */
function show(arg: unknown): string {
	return arg instanceof Error ? (arg.stack ?? arg.message) : String(arg)
}

/**
 * The message as the console prints it. React gives a format string first, so
 * each `%s` takes the next argument, such as the name of the component.
 */
function format([first, ...rest]: unknown[]): string {
	const text =
		typeof first === 'string'
			? first.replace(/%[sdifoOc]/g, (token) => (rest.length > 0 ? show(rest.shift()) : token))
			: show(first)

	return [text, ...rest.map(show)].join(' ')
}

/** Empties the messages for the test, and checks them when it finishes. */
function guardConsole(): void {
	messages.length = 0

	onTestFinished(({ task }) => {
		const found = messages.splice(0)

		if (found.length === 0 || task.result?.state === 'fail') return

		throw new Error(
			`the test wrote to the console and did not expect it. Fix the cause, or spy on the method and assert the call:\n\n${found.join('\n\n')}`,
		)
	})
}

/**
 * Puts the guard on `console.error` and `console.warn` for every test that a
 * setup file serves.
 *
 * Under `isolate: false` a worker runs the setup file again for each test file
 * and keeps this module, and the console, from the first one. The guard thus
 * goes on each method one time, and only the hook is registered again.
 */
export function installConsoleGuard(): void {
	for (const level of levels) {
		if (GUARDED in console[level]) continue

		const write = console[level].bind(console)

		console[level] = Object.assign(
			(...args: unknown[]) => {
				messages.push(`console.${level}: ${format(args)}`)

				write(...args)
			},
			{ [GUARDED]: true },
		)
	}

	beforeEach(guardConsole)
}
