import type { ReactNode } from 'react'

/**
 * Expands the hit target to the WCAG 44 px minimum (2.5.5) on coarse pointers
 * without altering visual layout. The invisible expansion sibling captures
 * pointer events across the full 44 px area and, sitting inside the interactive
 * host, forwards them to it via event bubbling. It is hidden on `pointer-fine`
 * devices, so mouse users keep the element's natural hit area.
 */
export function TouchTarget({ children }: { children: ReactNode }) {
	return (
		<>
			<span
				className="absolute left-1/2 top-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-events-auto pointer-fine:hidden"
				aria-hidden="true"
			/>
			{children}
		</>
	)
}
