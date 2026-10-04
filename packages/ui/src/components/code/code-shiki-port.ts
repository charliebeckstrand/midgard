/**
 * Starts the Shiki worker, which loads Shiki and each grammar and theme off the
 * main thread.
 *
 * @returns The worker, or `null` where the environment has no `Worker`: a
 *   server render, Node, or jsdom. `CodeBlock` then shows the plain block.
 * @remarks
 * `new Worker(new URL(…, import.meta.url))` is the form that Vite, webpack, and
 * Turbopack each recognize. Each emits the worker and its chunks as assets of
 * the app. Keep the call in this exact form, or a bundler stops seeing it.
 *
 * The check for an absent `Worker` is narrower than a `try`/`catch`. A
 * `catch` also takes a CSP `worker-src` refusal, and that error must reach the
 * caller.
 *
 * @internal
 */
export function openShikiWorker(): Worker | null {
	if (typeof Worker === 'undefined') return null

	return new Worker(new URL('./code-shiki-worker.ts', import.meta.url), { type: 'module' })
}
