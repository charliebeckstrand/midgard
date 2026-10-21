'use client'

import { useHeadless } from './context'

/** A unit: a callable that resolves its slots, and its output with no classes. */
type Unit<P, O> = ((props?: P) => O) & { readonly bare: O }

/**
 * Resolves the slots of a unit for a component. Under `<HeadlessProvider>`, it
 * gives the `bare` output of the unit, in which each slot is empty. Thus the
 * component writes each class from the slots, and it does not check the
 * headless flag.
 *
 * @param unit - The unit of the component (`k` of its kata).
 * @param props - The props of the unit.
 * @returns The class string of each slot, or the empty output when headless.
 * @see {@link Shell}: the wrapper element that a headless component drops.
 */
export function useSlots<P, O>(unit: Unit<P, O>, props?: P): O {
	return useHeadless() ? unit.bare : unit(props)
}
