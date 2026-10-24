import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { eventsRootOptions } from 'ui/events'
import { startDebug } from '../debug/index.tsx'
import { routerEvents } from '../debug/router.ts'
import { DocumentLocale } from './document-locale.ts'
import { readDocumentLocale } from './language.ts'
import { endStaleBuildWatch, watchStaleBuild } from './stale-build.tsx'

// A deploy replaces the hashed file names under an open tab, so the load of a
// chunk can fail. React Router reloads the page when a navigation cannot load
// its route, and the reload gets the new names. A load that fails in the
// background, such as a prefetch or a load in idle time, does not reload the
// page, as the reload closes what the reader has open. Before this module
// runs, the head script of `stale-build.tsx` reloads the page when a file of
// the page fails to load. After it, the page reloads when a deploy replaced
// its build.
endStaleBuildWatch()

watchStaleBuild()

// While the events run, the store records from before hydration.
await startDebug()

// The page hydrates in the locale that the HTML rendered in.
const locale = readDocumentLocale()

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<DocumentLocale value={locale}>
				<HydratedRouter {...routerEvents} />
			</DocumentLocale>
		</StrictMode>,
		// The bugs of React reach the events through the error callbacks of the root.
		eventsRootOptions,
	)
})
