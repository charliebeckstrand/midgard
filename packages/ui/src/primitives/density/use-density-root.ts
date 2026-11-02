import { useSyncExternalStore } from 'react'
import { type DensityStep, readRootDensity } from '../../core/density'
import { createListenerRegistry } from '../../utilities/listener-registry'

/**
 * Reads the step on the root element: the scope of the app. It returns `md`
 * when the root has no class for a step.
 */
function getSnapshot(): DensityStep {
	return readRootDensity(document.documentElement)
}

/**
 * One `MutationObserver` on the root element for every reader. It watches the
 * `class` attribute, which holds the step. The registry has one key.
 */
const registry = createListenerRegistry<Element, MutationRecord[]>({
	source: () => document.documentElement,
	attach: (root, _key, listener) => {
		const observer = new MutationObserver(listener)

		observer.observe(root, { attributes: true, attributeFilter: ['class'] })

		return () => observer.disconnect()
	},
})

/** Calls `listener` when the class of the root element changes. */
function subscribe(listener: () => void) {
	return registry.subscribe('class', listener)
}

/** The server has no root element to read, so it renders the `md` step. */
function getServerSnapshot(): DensityStep {
	return 'md'
}

/**
 * Returns the step on the root element, the scope of the app, and renders
 * again when it changes.
 *
 * @remarks
 * `AppearanceScript` writes the stored step on the root before the first
 * paint, so each stepped `density-*` class is correct at once. A JS value
 * cannot be correct on the server, which has no root element to read. The
 * server and the hydration render thus take `md`,
 * and the stored step applies in the render after hydration.
 *
 * @internal
 */
export function useDensityRoot(): DensityStep {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
