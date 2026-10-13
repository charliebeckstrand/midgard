'use client'

import { useIsPresent } from 'motion/react'

/**
 * Whether the element that calls it exits under `AnimatePresence`. Give the
 * value to the `inert` prop of that element.
 *
 * @remarks
 * `AnimatePresence` keeps an exiting child in the DOM until its exit animation
 * ends, with the props of its last render. A roving container outside the child
 * can then move focus to a row in it. The row unmounts at the end of the exit,
 * and focus falls to the body. `useA11yRoving` skips each item under an `inert`
 * ancestor, and `inert` also stops a pointer and the Tab key.
 *
 * Call it in the direct child of `AnimatePresence`, or in a descendant with no
 * other `AnimatePresence` between them. Outside an `AnimatePresence` it is
 * `false`. It reads the presence through `useIsPresent`, which does not hold
 * the removal, unlike `usePresence`. An open again during the exit keeps the
 * node and clears the value.
 *
 * `exit-inert-boundary.test.ts` lists each `AnimatePresence` site and holds it
 * to this hook or to a stated reason.
 *
 * @returns True while the element exits.
 * @internal
 */
export function useMountExitInert(): boolean {
	return !useIsPresent()
}
