'use client'

import { useCallback, useState } from 'react'
import { useIdleLoad } from './use-idle-load'

/** The result of {@link useIntentLoad}. */
export type IntentLoad<T> = {
	/** The resolved value, or `undefined` before the idle load or a request resolves. */
	module: T | undefined
	/**
	 * Gives the value to `then`. When the value is there, `then` runs in the
	 * same call, so a state change in it goes into the render of the press.
	 * Before that, the call starts the load, puts the value into state, and then
	 * runs `then`. A failed load does not call `then`, and the rejection is
	 * not caught.
	 */
	request: (then: (module: T) => void) => void
	/**
	 * Starts the load and ignores the result. Give it to the pointer enter, the
	 * pointer down, and the focus of the trigger. It has a stable identity.
	 */
	preload: () => void
}

/**
 * Loads a value in idle time after the mount, as {@link useIdleLoad} does, and
 * also loads it on the intent of the reader. Use it for the trigger of a surface
 * that loads its code before it opens, such as a menu or a dialog.
 *
 * @remarks
 * `preload` starts the load on a pointer or a focus, before the idle callback.
 * `request` loads on a press. It keeps one order: the value goes into state,
 * and then `then` runs, so the surface renders before it opens. A value that a
 * request loads stays in the state of this mount. The idle load and the
 * request must resolve to the same value, as a dynamic import does.
 * @param load - The load, such as `() => import('./panel')`. It must keep its
 *   identity: declare it at module scope.
 * @returns The value, `request`, and `preload`.
 * @example
 * ```tsx
 * const loadPanel = () => import('./panel')
 *
 * function Trigger() {
 *   const [open, setOpen] = useState(false)
 *
 *   const { module, request, preload } = useIntentLoad(loadPanel)
 *
 *   return (
 *     <>
 *       <Button onPointerEnter={preload} onFocus={preload} onClick={() => request(() => setOpen(true))}>
 *         Open
 *       </Button>
 *       {module && <module.Panel open={open} onOpenChange={setOpen} />}
 *     </>
 *   )
 * }
 * ```
 */
export function useIntentLoad<T>(load: () => Promise<T>): IntentLoad<T> {
	// The value from a request before the idle load resolved. A box, because the state setter calls a function value as an updater.
	const [requested, setRequested] = useState<{ value: T } | null>(null)

	const module = useIdleLoad(load) ?? requested?.value

	const request = (then: (module: T) => void) => {
		if (module !== undefined) {
			then(module)

			return
		}

		void load().then((value) => {
			setRequested({ value })

			then(value)
		})
	}

	const preload = useCallback(() => void load(), [load])

	return { module, request, preload }
}
