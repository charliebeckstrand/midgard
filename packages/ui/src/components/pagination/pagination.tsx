'use client'

import { type ComponentPropsWithoutRef, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { k } from '../../recipes/kata/pagination'
import { PAGINATION_ITEM_SELECTOR } from './pagination-constants'

export type PaginationProps = ComponentPropsWithoutRef<'nav'>

export function Pagination({ className, onKeyDown, ...props }: PaginationProps) {
	const ref = useRef<HTMLElement>(null)

	const handleRovingKeyDown = useRoving(ref, {
		itemSelector: PAGINATION_ITEM_SELECTOR,
		orientation: 'horizontal',
	})

	return (
		<nav
			ref={ref}
			data-slot="pagination"
			aria-label="Pagination"
			onKeyDown={(e) => {
				onKeyDown?.(e)
				if (!e.defaultPrevented) handleRovingKeyDown(e)
			}}
			className={cn(k(), className)}
			{...props}
		/>
	)
}
