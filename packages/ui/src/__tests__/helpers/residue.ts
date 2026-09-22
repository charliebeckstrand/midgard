import { beforeEach, onTestFinished } from 'vitest'

import { describeNode } from './describe-node'
import { type GlobalListener, liveGlobalListeners, watchGlobalListeners } from './global-listeners'

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
 * a React tree, the document click gate {@link swallowsClicks} reads, and the
 * listeners on the global targets. Appended body children cover portals and
 * injected regions.
 * `body.style` covers `use-scroll-lock`, which sets `overflow` and a
 * compensating `paddingRight` under a reference count. The marked head style
 * covers `use-grabbing-cursor`, which appends one under a count of its own.
 * Both unbalance exactly when a holder unmounts wrongly, which is the failure
 * this guard exists for, and neither is a body child.
 *
 * It was written against the browser suite's intermittent failure, and it
 * stayed silent through a failing run. It watched the body and not the
 * document, which is where the cause sat. The click gate closes that gap. An
 * open pointer drag is the cause the 2026-09-11 test architecture document
 * records, and this guard names the case that leaves one. It also closes a
 * residue rule that document has stated since August, which nothing enforced.
 *
 * The listener check generalises the click gate. A drag is one way to leave a
 * listener on the document, and any hook that subscribes to `window` without
 * a cleanup is another. The report names the stack that added the listener,
 * so the case that fails also points at the line to fix.
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

let swallowed = false

let listeners = new Set<GlobalListener>()

/** One global listener, as the failure message names it. */
function describeListener({ target, type, capture, origin }: GlobalListener): string {
	return `a ${target} "${type}" listener${capture ? ' (capture)' : ''}, added at ${origin}`
}

/**
 * Whether the page drops a click before it reaches the document.
 *
 * `@dnd-kit/core` adds a capture-phase `stopPropagation` to the document when a
 * drag activates, and removes it 50ms after the release. A case that leaves a
 * drag open leaves that listener. Every later click dies in the capture phase,
 * so no React root sees it and an interaction silently does nothing.
 *
 * The probe clicks the body, which sits outside every React root, so it reads
 * the page itself rather than one root's wiring. It touches no node, so a
 * `waitFor` can poll it without waking its own mutation observer.
 *
 * @returns Whether a click on the body fails to bubble back to the document.
 */
export function swallowsClicks(): boolean {
	let arrived = false

	const record = () => {
		arrived = true
	}

	document.addEventListener('click', record)

	try {
		document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))

		return !arrived
	} finally {
		document.removeEventListener('click', record)
	}
}

/** Records the page state this test inherits. */
function absorbResidue(): void {
	children = new WeakSet<Element>()

	for (const node of document.body.children) children.add(node)

	bodyStyle = document.body.style.cssText

	bodyClass = document.body.className

	rootStyle = document.documentElement.style.cssText

	swallowed = swallowsClicks()

	listeners = liveGlobalListeners()
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

	if (!swallowed && swallowsClicks()) {
		leaks.push('an open pointer drag: its capture listener drops every click the page takes next')
	}

	for (const entry of liveGlobalListeners()) {
		if (!listeners.has(entry)) leaks.push(describeListener(entry))
	}

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
		`this test left page state the next test inherits:\n  ${leaks.join('\n  ')}\nPut a node on the body through attach(), remove other state in onTestFinished or an afterEach, render inside the container renderUI returns, remove the listener the test added, or release a drag through drag().`,
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
	watchGlobalListeners()

	beforeEach(guardResidue)
}
