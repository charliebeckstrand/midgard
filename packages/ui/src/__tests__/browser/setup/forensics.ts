import { onTestFailed } from 'vitest'

/**
 * Prints the shared page's state whenever a browser test fails.
 *
 * Both instances run `isolate: false`, so one page serves every file an
 * instance runs and a test inherits whatever the run left in it. When a failure
 * is intermittent, the assertion message describes the last line and none of
 * that inheritance: a received 0 where 1 was expected says the handler did not
 * run, not that the page had scrolled, or that focus sat somewhere else, or
 * that the viewport was the one a file forty places earlier had set.
 *
 * This suite has such a failure. It fails about one run in eight, every victim
 * passes alone, and six mechanisms have been ruled out by measurement. Six more
 * could be ruled out one hunt at a time, or the next occurrence could carry its
 * own evidence. This is the second option, and it costs nothing on a green run.
 *
 * The snapshot is taken at the top of the teardown, before `cleanup` empties
 * the body, because `onTestFailed` runs after the teardown: a dump read there
 * reports an emptied body and an unfocused document for every failure, which
 * looks like evidence and is not. So the two halves are separate. The setup
 * captures first and prints later.
 */

/** Names an element the way a reader can find it. */
function name(node: Element | null): string {
	if (!node) return 'none'

	const slot = node.getAttribute('data-slot')

	const testId = node.getAttribute('data-testid')

	return [
		node.tagName.toLowerCase(),
		slot && `[data-slot="${slot}"]`,
		testId && `[data-testid="${testId}"]`,
	]
		.filter(Boolean)
		.join('')
}

/** The page state that a shared page can carry from one test into the next. */
function pageState(): string {
	const active = document.activeElement

	return [
		`viewport: ${window.innerWidth}x${window.innerHeight}`,
		`page scroll: ${Math.round(window.scrollX)},${Math.round(window.scrollY)}`,
		`body children: ${document.body.children.length} (${Array.from(document.body.children)
			.map(name)
			.join(', ')})`,
		`activeElement: ${name(active)}${active === document.body ? ' (nothing focused)' : ''}`,
		`document.hasFocus(): ${document.hasFocus()}`,
		`visibilityState: ${document.visibilityState}`,
		`open dialogs: ${document.querySelectorAll('dialog[open], [role="dialog"]').length}`,
	].join('\n  ')
}

let captured = ''

/**
 * Records the page state. Call it at the TOP of the teardown, before anything
 * clears the body, so the dump describes the page the failing test left.
 */
export function capturePageState(): void {
	captured = pageState()
}

/**
 * Registers the dump. Call it from a `beforeEach` in the setup file, which binds
 * it to each test in turn; `onTestFailed` has to run inside a test's context.
 */
export function reportPageStateOnFailure(): void {
	onTestFailed(() => {
		console.error(`page state at failure:\n  ${captured || pageState()}`)
	})
}
