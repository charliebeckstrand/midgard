import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { eventsRootOptions } from 'ui/events'
import { startDebug } from '../debug/index.tsx'
import { routerEvents } from '../debug/router.ts'
import { endStaleBuildWatch } from './stale-build.tsx'

// A deploy replaces the hashed file names under an open tab, so the load of a
// chunk can fail. React Router reloads the page when a navigation cannot load
// its route, and the reload gets the new names. A load that fails in the
// background, such as a prefetch or a load in idle time, does not reload the
// page, as the reload closes what the reader has open. Before this module
// runs, the head script of `stale-build.tsx` reloads the page when a file of
// the page fails to load.
endStaleBuildWatch()

// While the events run, the store records from before hydration.
await startDebug()

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<HydratedRouter {...routerEvents} />
		</StrictMode>,
		// The bugs of React reach the events through the error callbacks of the root.
		eventsRootOptions,
	)
})
