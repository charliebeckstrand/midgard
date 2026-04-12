'use client'

import { useRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { createNavItem, type NavItemProps } from './create-nav-item'
import { katachi } from '../../recipes'
import { useRovingFocus } from '../../hooks'

const k = katachi.nav

// ── Nav ─────────────────────────────────────────────────

export type NavProps = React.ComponentPropsWithoutRef<'nav'>

export function Nav({ className, children, ...props }: NavProps) {
	return (
		<ActiveIndicatorScope>
			<nav data-slot="nav" className={className} {...props}>
				{children}
			</nav>
		</ActiveIndicatorScope>
	)
}

// ── NavList ─────────────────────────────────────────────

export type NavListProps = React.ComponentPropsWithoutRef<'div'>

export function NavList({ className, children, ...props }: NavListProps) {
	const ref = useRef<HTMLDivElement>(null)
	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: '[data-slot="nav-item-inner"]:not(:disabled)',
		orientation: 'vertical',
	})

	return (
		<div
			ref={ref}
			data-slot="nav-list"
			className={cn(k.list, className)}
			onKeyDown={handleKeyDown}
			{...props}
		>
			{children}
		</div>
	)
}

// ── NavItem ─────────────────────────────────────────────

export type { NavItemProps }

export const NavItem = createNavItem({ slotPrefix: 'nav', variants: () => cn(k.item) })

// ── NavContent ──────────────────────────────────────────

export type NavContentProps = React.ComponentPropsWithoutRef<'div'>

export function NavContent({ className, ...props }: NavContentProps) {
	return <div data-slot="nav-content" className={className} {...props} />
}
