import { describeNode } from '../../helpers/describe-node'

/**
 * The shared page's state, for a failure message to carry.
 *
 * Both instances run `isolate: false`, so one page serves every file an
 * instance runs and a test inherits whatever the run left in it. When a failure
 * is intermittent, the assertion message describes the last line and none of
 * that inheritance: a received 0 where 1 was expected says the handler did not
 * run, not that the page had scrolled, or that focus sat somewhere else, or
 * that the viewport was the one a file forty places earlier had set.
 *
 * This suite has such a failure. It fails about one run in eight, every victim
 * passes alone, and six mechanisms have been ruled out by measurement. The next
 * occurrence carries its own evidence instead.
 *
 * Read it as the page the failing test left, because the caller reads it at the
 * top of the teardown, before `cleanup` empties the body.
 */

/** The page state that a shared page can carry from one test into the next. */
export function pageState(): string {
	const active = document.activeElement

	return [
		`viewport: ${window.innerWidth}x${window.innerHeight}`,
		`page scroll: ${Math.round(window.scrollX)},${Math.round(window.scrollY)}`,
		`body children: ${document.body.children.length} (${Array.from(document.body.children)
			.map(describeNode)
			.join(', ')})`,
		`activeElement: ${describeNode(active)}${active === document.body ? ' (nothing focused)' : ''}`,
		`document.hasFocus(): ${document.hasFocus()}`,
		`visibilityState: ${document.visibilityState}`,
		`open dialogs: ${document.querySelectorAll('dialog[open], [role="dialog"]').length}`,
	].join('\n  ')
}
