import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { startEventLog } from '../debug/event-log/index.tsx'

// The `sessionStorage` key of the page that reloaded for a stale chunk.
const RELOADED = 'docs:reloaded'

// A chunk fails to load when a deploy replaces the hashed file names under an
// open tab. One reload gets the new names. A page that fails again after its
// reload, or a device that is offline, does not reload again.
window.addEventListener('vite:preloadError', () => {
	try {
		if (!navigator.onLine || sessionStorage.getItem(RELOADED) === location.href) return

		sessionStorage.setItem(RELOADED, location.href)
	} catch {
		return
	}

	location.reload()
})

// While the Event log is on, it records from before hydration.
await startEventLog()

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<HydratedRouter />
		</StrictMode>,
	)
})
