import { beforeEach, onTestFinished } from 'vitest'

import { describeNode } from './describe-node'

/**
 * Fails a test that leaves page state behind.
 *
 * Both browser instances run `isolate: false`, so one page serves every file
 * the instance runs. Testing Library's `cleanup` removes the containers React
 * owns and nothing else, so what a test leaves outside them outlives it.
 *
 * The check reports at the culprit and then absorbs the leak. The test that
 * left the state fails, and the tests after it are not punished for it. Without
 * that, a leak is only ever visible as a failure somewhere downstream. That is
 * how the missing `__resetAnnouncer` call in this file's sibling survived a
 * suite that passes 583 tests.
 *
 * What it watches is every surface a shipped module is known to write outside
 * a React tree. Appended body children cover portals and injected regions.
 * `body.style` covers `use-scroll-lock`, which sets `overflow` and a
 * compensating `paddingRight` under a reference count. The marked head style
 * covers `use-grabbing-cursor`, which appends one under a count of its own.
 * Both unbalance exactly when a holder unmounts wrongly, which is the failure
 * this guard exists for, and neither is a body child.
 *
 * It is a guard rather than a cure. It was written against the browser suite's
 * intermittent failures and does not explain them: it stayed silent through a
 * failing run. What it closes is a residue rule the 2026-09-11 test
 * architecture document has stated since August, which nothing enforced.
 *
 * Both setups serve it now, because `unit` shares a window across a worker's
 * files on the same terms a browser instance shares a page.
 *
 * Extending it exposed a trap in its own placement. Called from the setup's
 * `afterEach`, where it began, it failed eleven cases in six jsdom files — and
 * not one was a leak. Every one reclaimed its node in `onTestFinished`, which
 * is what the message below and the 2026-09-11 document both instruct, and
 * `afterEach` runs first. So the guard failed the files that obeyed the rule it
 * enforces. No browser file clears a node that way, which is why the browser
 * suite never showed it.
 */

/** Node names a test may leave in the body: the page's own injected assets. */
const INJECTED = new Set(['STYLE', 'LINK', 'SCRIPT'])

/** The grabbing cursor's marker; `use-grabbing-cursor` stamps it on its style. */
const GRABBING = '[data-grabbing-cursor]'

let children = new WeakSet<Element>()

let bodyStyle = ''

let bodyClass = ''

let rootStyle = ''

/** Records the page state this test inherits. */
function absorbResidue(): void {
	children = new WeakSet<Element>()

	for (const node of document.body.children) children.add(node)

	bodyStyle = document.body.style.cssText

	bodyClass = document.body.className

	rootStyle = document.documentElement.style.cssText
}

/** Every leak the test is answerable for, named for the message. */
function collect(): string[] {
	const leaks: string[] = []

	for (const node of document.body.children) {
		if (!children.has(node) && !INJECTED.has(node.tagName)) leaks.push(describeNode(node))
	}

	if (document.body.style.cssText !== bodyStyle) {
		leaks.push(`body style: "${document.body.style.cssText}" (was "${bodyStyle}")`)
	}

	if (document.body.className !== bodyClass) {
		leaks.push(`body class: "${document.body.className}" (was "${bodyClass}")`)
	}

	if (document.documentElement.style.cssText !== rootStyle) {
		leaks.push(`root style: "${document.documentElement.style.cssText}" (was "${rootStyle}")`)
	}

	if (document.head.querySelector(GRABBING)) leaks.push('a grabbing-cursor style, left in head')

	return leaks
}

/**
 * Throws when the page carries state the test did not inherit.
 *
 * Both halves are private, because the order they run in is the whole contract
 * and a caller that could spell it could spell it wrong. {@link guardResidue}
 * is the only way in.
 */
function assertNoResidue(): void {
	const leaks = collect()

	if (leaks.length === 0) return

	throw new Error(
		`this test left page state the next test inherits:\n  ${leaks.join('\n  ')}\nRemove it in onTestFinished or an afterEach, or render inside the container renderUI returns.`,
	)
}

/**
 * Guards the page for every test of a suite. Call it from a setup file's
 * `beforeEach`.
 *
 * The snapshot is taken now, and the check is registered with
 * `onTestFinished` — the one placement that reads what every other teardown
 * left. Measured, the order is the setup's `afterEach`, then each test's own
 * `onTestFinished` in reverse, then this. A test's `afterEach` runs earlier
 * still, so both spellings of a per-test cleanup land before the check.
 *
 * The check ran from the setup's own `afterEach` first, which reads the page
 * before any `onTestFinished` has, and so failed eleven cases that removed
 * their node exactly as the message above tells them to.
 */
export function guardResidue(): void {
	absorbResidue()

	onTestFinished(assertNoResidue)
}

/** Registers {@link guardResidue} for every test a setup file serves. */
export function installResidueGuard(): void {
	beforeEach(guardResidue)
}
