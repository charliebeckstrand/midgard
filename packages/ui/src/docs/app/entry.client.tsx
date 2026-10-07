import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { onCaughtError } from '../debug/event-log/caught-errors.ts'
import { startDebug } from '../debug/index.tsx'

// A deploy replaces the hashed file names under an open tab, so the load of a
// chunk can fail. React Router reloads the page when a navigation cannot load
// its route, and the reload gets the new names. A load that fails in the
// background, such as a prefetch or a load in idle time, does not reload the
// page, as the reload closes what the reader has open.

// While the Event log is on, it records from before hydration.
await startDebug()

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<HydratedRouter />
		</StrictMode>,
		// An error that an error boundary catches reaches the Event log only through this option.
		{ onCaughtError },
	)
})
