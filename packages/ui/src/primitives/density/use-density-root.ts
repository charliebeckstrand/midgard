import { useSyncExternalStore } from 'react'
import { type DensityStep, readRootDensity } from '../../core/density'
import { createEmitter } from '../../utilities/emitter'

/**
 * Reads the step on the root element: the scope of the app. It returns `md`
 * when the root has no class for a step.
 */
function readRootStep(): DensityStep {
	return readRootDensity(document.documentElement)
}

const rootChange = createEmitter()

/** The one observer of the root element, while any reader listens. */
let observer: MutationObserver | null = null

let readers = 0

/**
 * Calls `listener` when the step on the root element changes. Each reader
 * shares one observer of the root.
 */
function subscribeRootStep(listener: () => void) {
	const unsubscribe = rootChange.subscribe(listener)

	if (readers++ === 0) {
		observer = new MutationObserver(rootChange.emit)

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		})
	}

	return () => {
		unsubscribe()

		if (--readers === 0) {
			observer?.disconnect()

			observer = null
		}
	}
}

/** The server has no root element to read, so it renders the `md` step. */
function serverRootStep(): DensityStep {
	return 'md'
}

/**
 * Returns the step on the root element, the scope of the app, and renders
 * again when it changes.
 *
 * @remarks
 * `AppearanceScript` writes the stored step on the root before the first
 * paint, so each class that selects its step through the `density-*` variants
 * is correct at once. A JS value cannot be correct on the server, which has no
 * root element to read. The server and the hydration render thus take `md`,
 * and the stored step applies in the render after hydration.
 *
 * @internal
 */
export function useDensityRoot(): DensityStep {
	return useSyncExternalStore(subscribeRootStep, readRootStep, serverRootStep)
}
