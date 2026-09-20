'use client'

import { useReportedChange } from './use-reported-change'

/**
 * Reports a surface's open state once per transition, read from the committed value
 * rather than from the call that asked for it.
 *
 * A flag with one call site does not need this: there the call site is the transition,
 * and the report rides it directly. Reach for this where the flag is derived, or is
 * written from routes the surface never runs itself. Each caller names its own.
 *
 * @param open The committed open state.
 * @param onOpenChange The caller's callback, raised once per transition.
 * @remarks The disclosure family's name for {@link useReportedChange}, which every other
 * report in the package reaches directly. Mounting open announces nothing.
 * @internal
 */
export function useOpenChange(open: boolean, onOpenChange?: (open: boolean) => void): void {
	useReportedChange(open, onOpenChange)
}
