'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { k } from '../../recipes/kata/breadcrumb'

export type BreadcrumbProps = ComponentPropsWithoutRef<'nav'>

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
			className={cn(k.root(), className)}
			{...props}
		/>
	)
}
