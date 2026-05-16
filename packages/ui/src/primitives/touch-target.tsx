import type { ReactNode } from 'react'

/**
 * Expands the hit target to the WCAG 44 px minimum on coarse pointers without
 * altering visual layout. The invisible expansion sibling is hidden on
 * `pointer-fine` devices, so mouse users see the element at its natural size.
 */
export function TouchTarget({ children }: { children: ReactNode }) {
	return (
		<>
			<span
				className="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-events-none pointer-fine:hidden"
				aria-hidden="true"
			/>
			{children}
		</>
	)
}
