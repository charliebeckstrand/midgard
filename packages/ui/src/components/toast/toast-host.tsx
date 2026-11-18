'use client'

import type { ReactNode } from 'react'
import { useIdlePreload } from '../../hooks/use-idle-preload'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { createLazyModule } from '../../utilities/lazy-module'
import { useToastViewport } from './context'
import type { ToastProps } from './toast'
import { ToastProvider, type ToastProviderProps } from './toast-provider'

/**
 * The module of the viewport. The host loads it in idle time after the
 * hydration. Thus the app does not load the viewport before it hydrates, and
 * the first toast does not wait for it.
 * @internal
 */
const toastModule = createLazyModule(() => import('./toast'))

/**
 * The toast setup that `UIProvider` takes in its `toast` prop: the
 * `position` of the viewport, and the `duration` and the `maxToasts` of the
 * queue.
 * @internal
 */
export type ToastHostOptions = Pick<ToastProviderProps, 'duration' | 'maxToasts'> &
	Pick<ToastProps, 'position'>

/**
 * Renders the {@link Toast} viewport of the host. It loads the module of the
 * viewport in idle time after the hydration, and renders the viewport when the
 * module is loaded. A toast before that loads the module at once. The viewport
 * then plays the enter of the toasts in the queue.
 *
 * @remarks
 * A module that does not load for a toast is an unhandled rejection, so the
 * error reaches the error reporting of the app. The idle load gives no error. The queue still dismisses each toast at its
 * time.
 * @internal
 */
function ToastViewport({ position }: Pick<ToastProps, 'position'>) {
	const queued = useToastViewport().toasts.length > 0

	useIdlePreload(toastModule)

	const viewport = useLazyModule(toastModule, queued)

	return viewport && <viewport.Toast position={position} />
}

/**
 * Mounts a {@link ToastProvider} and its lazy {@link Toast} viewport around its
 * children, so `useToast()` in the children works with no setup. The viewport
 * loads in idle time after the hydration, or on the first toast when that
 * comes first. It portals into the nearest portal container, so in a viewport
 * frame (`BreakpointFrame`) the toasts stay in the frame. `UIProvider` mounts
 * it for the app, and the docs mount it in each viewport frame of an example.
 * @internal
 */
export function ToastHost({
	options,
	children,
}: {
	options?: ToastHostOptions | undefined
	children: ReactNode
}) {
	return (
		<ToastProvider duration={options?.duration} maxToasts={options?.maxToasts}>
			{children}
			<ToastViewport position={options?.position} />
		</ToastProvider>
	)
}
