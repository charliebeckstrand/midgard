import type { EventSource } from 'ui/events'
import { all, bursts } from '../../modules/events/engine/events-sources/dom.ts'
import { noop } from '../../utilities/noop.ts'
import { listenComponentEvents } from './component-events.ts'

// The sources of the docs, which run after the sources of the module: the
// callbacks that a page gives to a component, and the hot updates of the dev
// server.

/**
 * The callbacks that a page gives to a component or to a module. A burst of
 * calls of one callback of one component is one batch.
 */
const components: EventSource = (note) => {
	const { getBatch, stop } = bursts()

	const unlisten = listenComponentEvents(({ source, name, path, text, detail }) =>
		note({ kind: source, name, text, detail, batch: getBatch(`${name} ${path}`) }),
	)

	return all([unlisten, stop])
}

/** Each hot update and each error of the dev server. The `import.meta.hot` of Vitest has no `off`. */
const hmr: EventSource = (note) => {
	const hot = import.meta.hot

	if (!hot?.off) return noop

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
export const DOCS_SOURCES: readonly EventSource[] = [components, hmr]
