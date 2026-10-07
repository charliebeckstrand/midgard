'use client'

import { type ReactNode, use, useEffect, useState } from 'react'
import { createContext } from '../../core'
import { useIdleLoad } from '../../hooks/use-idle-load'
import { useToastViewport } from './context'
import type { Toast, ToastProps } from './toast'
import { ToastProvider, type ToastProviderProps } from './toast-provider'

/**
 * Loads the module of the viewport. The host loads it in idle time after the
 * hydration. Thus the app does not load the viewport before it hydrates, and
 * the first toast does not wait for it.
 * @internal
 */
const loadToast = () => import('./toast')

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

	// The module of the viewport, from a toast before the idle load on.
	const [queuedModule, setQueuedModule] = useState<{ Toast: typeof Toast } | null>(null)

	const viewport = useIdleLoad(loadToast) ?? queuedModule

	useEffect(() => {
		if (queued && !viewport) void loadToast().then(setQueuedModule)
	}, [queued, viewport])

	return viewport && <viewport.Toast position={position} />
}

/** True under a {@link ToastHost} that mounted the queue. @internal */
const [ToastHostContext] = createContext<boolean>('ToastHost', { default: false })

/**
 * Mounts a {@link ToastProvider} and its {@link Toast} viewport around its
 * children, so `useToast()` works with no setup. `UIProvider` mounts it. The
 * viewport loads in idle time after the hydration, or on the first toast when
 * that comes first.
 *
 * @remarks
 * Only the outermost host mounts the queue. A host under another host renders
 * its children only, so a nested `UIProvider` uses the queue and the viewport
 * of the outer provider, and its `options` have no effect. A `ToastProvider`
 * in the subtree still makes a queue of its own for its descendants.
 * @internal
 */
export function ToastHost({
	options,
	children,
}: {
	options: ToastHostOptions | undefined
	children: ReactNode
}) {
	const hosted = use(ToastHostContext)

	if (hosted) return children

	return (
		<ToastHostContext value>
			<ToastProvider duration={options?.duration} maxToasts={options?.maxToasts}>
				{children}
				<ToastViewport position={options?.position} />
			</ToastProvider>
		</ToastHostContext>
	)
}
