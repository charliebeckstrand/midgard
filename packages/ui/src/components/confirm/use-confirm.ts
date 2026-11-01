'use client'

import { type ConfirmFunction, useConfirmContext } from './context'

/**
 * Returns a function that asks the user a yes-or-no question in a
 * {@link Confirm} dialog, and waits for the answer.
 *
 * @remarks
 * The dialog is the one that `UIProvider` mounts, and it portals into the
 * container of that provider. The provider loads the module of the dialog in
 * idle time after the hydration. A question before that loads it at once, so
 * the dialog of that question can show some frames later. When the module does
 * not load, the promise rejects with the error.
 * Use it in place of a `Confirm` of your own when the question has no custom
 * children: the caller then keeps no open state and no target state. The function keeps its identity across renders.
 *
 * The dialog renders at the provider, not at the caller. Its content reads the
 * contexts above the provider, such as `LocaleProvider`, and not the contexts
 * between the provider and the caller.
 *
 * Use the controlled {@link Confirm} for a message with custom children.
 * @example
 * ```tsx
 * const confirm = useConfirm()
 *
 * async function remove(id: string) {
 *   if (await confirm({ title: 'Delete the file?', confirm: { label: 'Delete', color: 'red' } })) {
 *     deleteFile.mutate(id)
 *   }
 * }
 * ```
 * @throws When no `UIProvider` is above the caller.
 * @see {@link ConfirmOptions}
 */
export function useConfirm(): ConfirmFunction {
	return useConfirmContext()
}
