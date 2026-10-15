import type { EventViewport } from './types'

// The probes of the store: the reading of the viewport and the frames of a
// stack.

/** The heights that place a surface fixed to an edge now, with no scroll position. */
export function viewport(): Omit<EventViewport, 'y'> {
	const visual = window.visualViewport

	const probe = document.body.appendChild(createProbe())

	// A computed style is live, so the probe stays until each value is read.
	const [svh, dvh, lvh, safe] = Array.from(probe.children, (child) => {
		const { height, paddingTop, paddingBottom } = getComputedStyle(child)

		return [height, paddingTop, paddingBottom].map((value) =>
			Math.round(Number.parseFloat(value) || 0),
		)
	})

	probe.remove()

	return {
		visual: {
			height: Math.round(visual?.height ?? 0),
			offsetTop: Math.round(visual?.offsetTop ?? 0),
		},
		window: window.innerHeight,
		svh: svh?.[0] ?? 0,
		dvh: dvh?.[0] ?? 0,
		lvh: lvh?.[0] ?? 0,
		safe: { top: safe?.[1] ?? 0, bottom: safe?.[2] ?? 0 },
	}
}

/** The frames of a stack, with each URL cut to its file name. The `Error` header of a V8 stack goes out. */
export function framesOf(stack: string | undefined): string[] {
	return (stack ?? '')
		.split('\n')
		.map((frame) => frame.trim().replace(/https?:\/\/[^\s)]*\//g, ''))
		.filter((frame) => frame && frame !== 'Error')
}

/** The message of a thrown value: the message of an `Error`, else the value as text. */
export function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

/**
 * The frames of the stack of a thrown value. A thrown value that is not an
 * `Error` has none. The header of a V8 stack, the name and the message, goes
 * out, so the first frame is the frame of the throw on each engine.
 */
export function stackOf(error: unknown): string[] {
	if (!(error instanceof Error)) return []

	const header = `${String(error)}\n`

	const stack = error.stack ?? ''

	return framesOf(stack.startsWith(header) ? stack.slice(header.length) : stack)
}

/**
 * A box fixed to the layout viewport, with a child for each viewport unit and
 * one for the safe-area insets.
 */
function createProbe(): HTMLElement {
	const probe = document.createElement('div')

	probe.setAttribute('aria-hidden', 'true')

	probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none'

	for (const height of ['100svh', '100dvh', '100lvh', '0']) {
		probe.appendChild(document.createElement('div')).style.cssText =
			`position:absolute;height:${height};padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)`
	}

	return probe
}

/** The text of the event of a bug that React or a router reports: the origin, the message, and the first component frame. */
export function bugText(origin: string, error: unknown, componentStack?: string): string {
	const [component] = framesOf(componentStack)

	return `${origin} ${messageOf(error)}${component ? ` ${component}` : ''}`
}
