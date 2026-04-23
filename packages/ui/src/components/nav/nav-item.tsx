'use client'

import type { MouseEvent } from 'react'
import { cn } from '../../core'
import { useCurrentContext } from '../../primitives'
import { type NavItemProps as BaseNavItemProps, createNavItem } from './create-nav-item'
import { k } from './variants'

// ── NavItem ─────────────────────────────────────────────

const BaseNavItem = createNavItem({ slotPrefix: 'nav', variants: () => cn(k.item) })

export type NavItemProps = BaseNavItemProps & { value?: string }

export function NavItem({ value, current, onClick, ...props }: NavItemProps) {
	const ctx = useCurrentContext()

	const isCurrent = current ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: MouseEvent<HTMLElement>) {
		onClick?.(e as MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return <BaseNavItem current={isCurrent} onClick={handleClick} {...props} />
}
