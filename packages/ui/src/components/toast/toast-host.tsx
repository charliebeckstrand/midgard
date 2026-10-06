'use client'

import { type ReactNode, use } from 'react'
import { createContext } from '../../core'
import { Toast, type ToastProps } from './toast'
import { ToastProvider, type ToastProviderProps } from './toast-provider'

/**
 * The toast setup that `UIProvider` takes in its `toast` prop: the
 * `position` of the viewport, and the `duration` and the `maxToasts` of the
 * queue.
 * @internal
 */
export type ToastHostOptions = Pick<ToastProviderProps, 'duration' | 'maxToasts'> &
	Pick<ToastProps, 'position'>

/** True under a {@link ToastHost} that mounted the queue. @internal */
const [ToastHostContext] = createContext<boolean>('ToastHost', { default: false })

/**
 * Mounts a {@link ToastProvider} and its {@link Toast} viewport around its
 * children, so `useToast()` works with no setup. `UIProvider` mounts it.
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
				<Toast position={options?.position} />
			</ToastProvider>
		</ToastHostContext>
	)
}
