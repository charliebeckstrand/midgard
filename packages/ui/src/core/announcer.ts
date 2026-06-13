/** Options for {@link announce}. */
export type AnnounceOptions = {
	/**
	 * Announce assertively (interrupts the user) rather than politely.
	 * @defaultValue false
	 */
	assertive?: boolean
}

// One pair of visually-hidden live regions for the whole app, created lazily on
// first announce and shared via module scope.
let politeRegion: HTMLElement | null = null

let assertiveRegion: HTMLElement | null = null

function createRegion(assertive: boolean): HTMLElement {
	const el = document.createElement('div')

	el.setAttribute('role', assertive ? 'alert' : 'status')
	el.setAttribute('aria-live', assertive ? 'assertive' : 'polite')

	el.setAttribute('aria-atomic', 'true')
	el.setAttribute('data-slot', 'live-region')

	el.className = 'sr-only'

	document.body.appendChild(el)

	return el
}

function region(assertive: boolean): HTMLElement {
	if (assertive) {
		assertiveRegion ??= createRegion(true)

		return assertiveRegion
	}

	politeRegion ??= createRegion(false)

	return politeRegion
}

/**
 * Imperative screen-reader announcement. Sends `message` to a visually-hidden
 * `aria-live` region appended to `document.body`, lazily created on first use
 * and shared process-wide. Use for one-off, event-driven feedback ("Copied",
 * "Tag added") with no natural focus or DOM home; for narrating a changing
 * value, prefer the declarative `useA11yAnnouncements`. No-op during SSR and
 * for empty messages.
 */
export function announce(message: string, { assertive = false }: AnnounceOptions = {}): void {
	if (typeof document === 'undefined' || !message) return

	const node = region(assertive)

	// Clears, then sets on the next microtask; live regions announce only
	// observed mutations, even for identical messages.
	node.textContent = ''

	queueMicrotask(() => {
		node.textContent = message
	})
}

/** Test-only: removes the injected regions. */
export function __resetAnnouncer(): void {
	politeRegion?.remove()
	assertiveRegion?.remove()

	politeRegion = null
	assertiveRegion = null
}
