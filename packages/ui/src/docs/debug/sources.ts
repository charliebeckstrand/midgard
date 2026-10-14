import type { EventSource } from 'ui/events'
import { bursts, on } from '../../modules/events/engine/events-sources/dom.ts'
import { listenComponentEvents } from './component-events.ts'

// The sources of the docs, which run after the sources of the module: the
// readings of the head script and of the scroll restoration, the callbacks
// that a page gives to a component, and the hot updates of the dev server.

/** A reading that the head script keeps before the store starts (`index.tsx`). */
type Reading = { time: number; kind: string; text: string; y: number }

declare global {
	interface Window {
		__eventReadings?: { entries: Reading[]; stop: () => void }
	}
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

/** The scroll reading of a page load: the scroll restoration of the history, and the kept position. */
function scrollReading(): string {
	return `restore ${history.scrollRestoration} kept y ${keptScroll()}`
}

/**
 * The scroll reading of each start and of each restore from the back-forward
 * cache, and the readings that the head script keeps before the first start.
 */
const readings: EventSource = (note) => {
	note({ kind: 'load', text: scrollReading() })

	window.__eventReadings?.stop()

	for (const { time, kind, text, y } of window.__eventReadings?.entries ?? [])
		note({ kind, text, time, y })

	delete window.__eventReadings

	return on(window, ['pageshow'], (event) => {
		if ((event as PageTransitionEvent).persisted) note({ kind: 'load', text: scrollReading() })
	})
}

/**
 * The callbacks that a page gives to a component or to a module. A burst of
 * calls of one callback of one component is one batch.
 */
const components: EventSource = (note) => {
	const { batchOf, stop } = bursts()

	const unlisten = listenComponentEvents(({ source, name, path, text, detail }) =>
		note({ kind: source, name, text, detail, batch: batchOf(`${name} ${path}`) }),
	)

	return () => {
		unlisten()

		stop()
	}
}

/** Each hot update and each error of the dev server. The `import.meta.hot` of Vitest has no `off`. */
const hmr: EventSource = (note) => {
	const hot = import.meta.hot

	if (!hot?.off) return () => undefined

	const update = ({ updates }: { updates: { path: string }[] }) =>
		note({ kind: 'hmr', text: `update ${updates.map((item) => item.path).join(' ')}` })

	const error = ({ err: cause }: { err: { message: string } }) =>
		note({ kind: 'hmr', text: `error ${cause.message}` })

	hot.on('vite:afterUpdate', update)

	hot.on('vite:error', error)

	return () => {
		hot.off?.('vite:afterUpdate', update)

		hot.off?.('vite:error', error)
	}
}

/** The sources of the docs. */
export const DOCS_SOURCES: readonly EventSource[] = [readings, components, hmr]
