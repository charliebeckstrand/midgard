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
 * and shared process-wide. Use it for one-off, event-driven feedback with no
 * natural focus or DOM home, such as "Copied" or "Tag added". To narrate a
 * changing value, prefer the declarative `useA11yAnnouncements`. No-op during SSR and
 * for empty messages.
 *
 * @remarks
 * A message equal to the current region text gets a trailing no-break space
 * (`U+00A0`), so that the repeat is a real change of text. A read of the region
 * text must allow for this suffix.
 */
export function announce(message: string, { assertive = false }: AnnounceOptions = {}): void {
	if (typeof document === 'undefined' || !message) return

	const node = region(assertive)

	// A live region speaks only a real change of text. The clear and the set run in one task,
	// so the region shows no empty state between them. Thus a repeat of the current text gets
	// a trailing no-break space, which screen readers do not speak. The repeat after that
	// writes the plain text again.
	const text = node.textContent === message ? `${message}\u00A0` : message

	node.textContent = ''

	queueMicrotask(() => {
		node.textContent = text
	})
}

/** Test-only: removes the injected regions. */
export function __resetAnnouncer(): void {
	politeRegion?.remove()
	assertiveRegion?.remove()

	politeRegion = null
	assertiveRegion = null
}
