// This module imports nothing at runtime. A test that must empty the memo cell
// resets its module registry and imports this file again, and a small import
// keeps the cost of that step out of the time limit of the test.

// Lazy-load shiki on first use.
let shikiPromise: Promise<typeof import('shiki')> | null = null

/**
 * Dynamically imports the Shiki highlighter on first call, memoizing the
 * in-flight promise so the heavy module is fetched at most once per session.
 *
 * @returns The resolved `shiki` module exports.
 * @remarks
 * Call to warm the highlighter ahead of rendering a `CodeBlock`. Only a
 * pending or resolved import stays memoized. A rejection clears the cell and
 * reaches the caller, so the next call fetches again. That beats replaying one
 * transient chunk failure for the rest of the session.
 */
export function loadShiki() {
	if (!shikiPromise) {
		shikiPromise = import('shiki').catch((error) => {
			// Drop the memo before the rejection leaves. A cell left holding it
			// answers every later call with the same failure, and CodeBlock
			// swallows it, so one bad chunk fetch paints the plain fallback for the
			// rest of the session.
			shikiPromise = null

			throw error
		})
	}

	return shikiPromise
}
