'use client'

import { createLazyModule } from '../../utilities/lazy-module'

/** The module of the tooltip body. @internal */
type TooltipBodyModule = typeof import('./tooltip-body')

/** The tooltip body, which loads in a chunk of its own. */
const tooltipBody = createLazyModule(() => import('./tooltip-body'))

/**
 * Loads the module of the tooltip body, which carries Motion and the floating
 * surface. `TooltipContent` calls it in idle time after the hydration, so a page
 * with no tooltip does not load it. The first call starts the load, and each
 * later call gets the same promise. A load that fails is forgotten, so the
 * next call tries again.
 *
 * @remarks A preload that fails is an unhandled rejection, so the error
 * reaches the error reporting of the app. The idle load gives no error, and a
 * later preload reports it.
 * @internal
 */
export function loadTooltipBody(): Promise<TooltipBodyModule> {
	return tooltipBody.load()
}

/**
 * Starts the load of the tooltip body for a reader who shows intent: a hover
 * or a focus on a trigger, before the idle load. The open delay of a hover
 * covers the load.
 * @internal
 */
export function preloadTooltipBody(): void {
	void loadTooltipBody()
}

/** Subscribes to the load of the tooltip body, for `useSyncExternalStore`. @internal */
export function subscribeTooltipBody(listener: () => void): () => void {
	return tooltipBody.subscribe(listener)
}

/** The loaded module of the tooltip body, or `null`. @internal */
export function readTooltipBody(): TooltipBodyModule | null {
	return tooltipBody.read()
}
