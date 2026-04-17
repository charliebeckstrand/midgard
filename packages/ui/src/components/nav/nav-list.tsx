'use client'

import { useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives'
import { useNavbar } from '../navbar/context'
import { k } from './variants'

// ── NavList ─────────────────────────────────────────────

export type NavListProps = React.ComponentPropsWithoutRef<'div'> & {
	orientation?: 'vertical' | 'horizontal'
}

export function NavList({ orientation, className, children, ...props }: NavListProps) {
	const inNavbar = useNavbar()

	const resolvedOrientation = orientation ?? (inNavbar ? 'horizontal' : 'vertical')

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: '[data-slot="nav-item-inner"]:not(:disabled)',
		orientation: resolvedOrientation,
	})

	return (
		<ActiveIndicatorScope>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: roving focus on nav items within a <nav> landmark */}
			<div
				ref={ref}
				data-slot="nav-list"
				data-orientation={resolvedOrientation}
				className={cn(k.list.base, k.list.orientation[resolvedOrientation], className)}
				onKeyDown={handleKeyDown}
				{...props}
			>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}
