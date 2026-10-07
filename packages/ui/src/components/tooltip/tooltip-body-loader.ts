'use client'

/** The module of the tooltip body. @internal */
type TooltipBodyModule = typeof import('./tooltip-body')

/** The loaded module, or `null` until the first load resolves. */
let body: TooltipBodyModule | null = null

/** The load in flight or resolved, or `null` before the first load and after a failure. */
let pending: Promise<TooltipBodyModule> | null = null

const listeners = new Set<() => void>()

/**
 * Loads the module of the tooltip body, which carries Motion and the floating
 * surface. A page that opens no tooltip does not load it. The first call starts
 * the load, and each later call gets the same promise. A load that fails is
 * forgotten, so the next call tries again.
 *
 * @remarks A load that fails is an unhandled rejection, so the error reaches
 * the error reporting of the app.
 * @internal
 */
export function loadTooltipBody(): Promise<TooltipBodyModule> {
	pending ??= import('./tooltip-body').then(
		(module) => {
			body = module

			for (const listener of listeners) listener()

			return module
		},
		(error: unknown) => {
			pending = null

			throw error
		},
	)

	return pending
}

/**
 * Starts the load of the tooltip body for a reader who shows intent: a hover
 * or a focus on a trigger. The open delay of a hover covers the load.
 * @internal
 */
export function preloadTooltipBody(): void {
	void loadTooltipBody()
}

/** Subscribes to the load of the tooltip body, for `useSyncExternalStore`. @internal */
export function subscribeTooltipBody(listener: () => void): () => void {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}

/** The loaded module of the tooltip body, or `null`. @internal */
export function readTooltipBody(): TooltipBodyModule | null {
	return body
}
