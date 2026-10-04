import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { preloadDebugTools } from '../engine/debug/registry'

// Marks a history entry that already recovery-reloaded once. history.state
// survives the reload, so a still-broken page cannot reload again, and a new
// navigation starts a fresh entry, which re-arms recovery.
const RELOADED = 'docs:preload-error-reloaded'

// A lazy chunk 404s when a deploy swaps hashed filenames under a long-lived
// tab; Vite signals it with `vite:preloadError`. Reload once per history entry
// to pull the new page and its chunk names.
window.addEventListener('vite:preloadError', () => {
	if (history.state === RELOADED) return

	// An offline failure is transient, not a stale deploy. A reload would trade
	// a working page for the browser's network-error page.
	if (!navigator.onLine) return

	history.replaceState(RELOADED, '')

	window.location.reload()
})

// A debug tool that is on starts its work while the page hydrates. Its header
// button is in the prerendered page, so hydration does not wait for it.
void preloadDebugTools()

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<HydratedRouter />
		</StrictMode>,
	)
})
