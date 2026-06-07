export type AnnounceOptions = {
	/** Announce assertively (interrupts the user) rather than politely. @default false */
	assertive?: boolean
}

// One pair of visually-hidden live regions for the whole app, created lazily on
// first announce and shared via module scope — no provider to mount.
let politeRegion: HTMLElement | null = null

let assertiveRegion: HTMLElement | null = null

// Inline rather than relying on a `sr-only` utility class, so the announcer
// works regardless of the host app's CSS.
const VISUALLY_HIDDEN =
	'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap'

function createRegion(assertive: boolean): HTMLElement {
	const el = document.createElement('div')

	el.setAttribute('role', assertive ? 'alert' : 'status')
	el.setAttribute('aria-live', assertive ? 'assertive' : 'polite')
	el.setAttribute('aria-atomic', 'true')
	el.setAttribute('data-slot', 'live-region')
	el.style.cssText = VISUALLY_HIDDEN

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
 * `aria-live` region appended to `document.body` — lazily created on first use,
 * shared process-wide, so callers need no `AnnouncerProvider`. Use it for
 * one-off, event-driven feedback ("Copied", "Tag added") that has no natural
 * focus or DOM home; for narrating a changing value, prefer the declarative
 * `useA11yAnnouncements`. No-op during SSR and for empty messages.
 */
export function announce(message: string, { assertive = false }: AnnounceOptions = {}): void {
	if (typeof document === 'undefined' || !message) return

	const node = region(assertive)

	// Clear first so re-announcing an identical message still registers as a
	// change; set on the next microtask so the mutation is observed.
	node.textContent = ''

	queueMicrotask(() => {
		node.textContent = message
	})
}

/** Test-only: removes the injected regions so suites stay isolated. */
export function __resetAnnouncer(): void {
	politeRegion?.remove()
	assertiveRegion?.remove()

	politeRegion = null
	assertiveRegion = null
}
