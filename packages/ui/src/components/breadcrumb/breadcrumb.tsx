'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { useRoving } from '../../hooks'

export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

/** Navigation landmark for a trail of links — arrow keys rove focus horizontally across the anchors. */
export function Breadcrumb({ className, onKeyDown, ...props }: BreadcrumbProps) {
	const ref = useRef<HTMLElement>(null)

	const handleRovingKeyDown = useRoving(ref, {
		itemSelector: 'a[href]',
		orientation: 'horizontal',
	})

	return (
		<nav
			ref={ref}
			data-slot="breadcrumb"
			aria-label="Breadcrumb"
			onKeyDown={(e) => {
				onKeyDown?.(e)
				if (!e.defaultPrevented) handleRovingKeyDown(e)
			}}
			className={className}
			{...props}
		/>
	)
}
