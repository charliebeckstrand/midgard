/**
 * Fails a test that leaves a node on `document.body`.
 *
 * Both browser instances run `isolate: false`, so one page serves every file
 * the instance runs. Testing Library's `cleanup` removes the containers React
 * owns and nothing else, so anything a test appends to the body outlives it —
 * a portal host, a detached overlay, a measurement probe. The next test then
 * renders beneath it.
 *
 * The check reports at the culprit and then absorbs the leak: the test that
 * left the node fails, and the tests after it are not punished for it. Without
 * that, a leak is only ever visible as a failure somewhere downstream, which is
 * how the missing `__resetAnnouncer` call in this file's sibling survived a
 * suite that passes 583 tests.
 *
 * It is a guard rather than a cure, and it is worth being exact about what it
 * does not do. It was written against the suite's intermittent failures and it
 * does not explain them: it stayed silent through a run that failed, and the
 * body carried nothing at the moment of the failure. Those are tracked in the
 * 2026-09-11 test architecture document, still undiagnosed. What this closes is
 * a residue rule that document has stated since August while nothing enforced
 * it and no file in this suite practised it.
 *
 * Style, link and script elements are ignored, because Vite and Tailwind inject
 * those into the page and no test owns them.
 */

/** Node names a test may leave behind: the page's own injected assets. */
const INJECTED = new Set(['STYLE', 'LINK', 'SCRIPT'])

let expected = new WeakSet<ChildNode>()

/** Records the body's current children as the set this test inherits. */
function absorb(): void {
	expected = new WeakSet<ChildNode>()

	for (const node of document.body.childNodes) expected.add(node)
}

/** A leaked node named the way a reader can find it. */
function describe(node: Element): string {
	const slot = node.getAttribute('data-slot')

	const testId = node.getAttribute('data-testid')

	const label = [
		node.tagName.toLowerCase(),
		slot && `[data-slot="${slot}"]`,
		testId && `[data-testid="${testId}"]`,
	]
		.filter(Boolean)
		.join('')

	const text = node.textContent?.trim().slice(0, 40)

	return text ? `${label} — ${text}` : label
}

/**
 * Records the body's children as the set this test inherits. Call it from a
 * `beforeEach`, before the test renders anything.
 */
export function absorbBodyResidue(): void {
	absorb()
}

/**
 * Throws when the body carries a node the test did not inherit.
 *
 * Call it at the END of the teardown that clears the body, in the same hook
 * rather than a later one: Vitest runs `afterEach` as a stack, so a hook
 * registered after the teardown would run before it and read every render
 * container as a leak.
 */
export function assertNoBodyResidue(): void {
	const leaked = Array.from(document.body.children).filter(
		(node) => !expected.has(node) && !INJECTED.has(node.tagName),
	)

	// Absorb before throwing: the next test inherits a clean expectation and
	// fails only for what it leaks itself.
	absorb()

	if (leaked.length === 0) return

	throw new Error(
		`this test left ${leaked.length} node(s) on document.body, which the next test renders beneath:\n  ${leaked
			.map(describe)
			.join(
				'\n  ',
			)}\nRemove them in onTestFinished, or render them inside the container renderUI returns.`,
	)
}
