'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { breadcrumbVariants } from '../../recipes/kata/breadcrumb'

const BREADCRUMB_ITEM_SELECTOR = 'a[href]'

export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

export function Breadcrumb({ className, onKeyDown, ...props }: BreadcrumbProps) {
	const ref = useRef<HTMLElement>(null)

	const handleRovingKeyDown = useRoving(ref, {
		itemSelector: BREADCRUMB_ITEM_SELECTOR,
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
			className={cn(breadcrumbVariants(), className)}
			{...props}
		/>
	)
}
