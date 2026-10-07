// The probes of the Event log: the reading of the viewport, the frames of a
// stack, and the kept scroll position.

/** The heights that place a surface fixed to an edge, in pixels: the visual viewport and its offset, the window, the viewport units, and the safe-area insets. */
export type Viewport = {
	visual: { height: number; offsetTop: number }
	window: number
	svh: number
	dvh: number
	lvh: number
	safe: { top: number; bottom: number }
}

/** The heights that place a surface fixed to an edge now. */
export function viewport(): Viewport {
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

/**
 * The detail of an error line: the frames of the stack, and the frames of the
 * component stack when an error boundary catches the error.
 */
export type ErrorDetail = { stack: string[]; componentStack?: string[] }

/** The detail of an error: its stack. A thrown value that is not an `Error` has none. */
export function errorDetail(error: unknown): ErrorDetail | undefined {
	return error instanceof Error && error.stack ? { stack: framesOf(error.stack) } : undefined
}

/** The kept scroll position of `<ScrollRestoration>` for this history entry. */
function keptScroll(): string {
	try {
		const positions = JSON.parse(sessionStorage.getItem('react-router-scroll-positions') ?? '{}')

		return String(positions[history.state?.key ?? 'default'] ?? '-')
	} catch {
		return '-'
	}
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

/** The scroll reading of a page load: the scroll restoration of the history, and the kept position. */
export function scrollReading(): string {
	return `restore ${history.scrollRestoration} kept y ${keptScroll()}`
}
