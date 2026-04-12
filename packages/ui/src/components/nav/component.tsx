'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives'
import { useRovingFocus } from '../../hooks'
import { katachi } from '../../recipes'
import { type NavContextValue, NavProvider, useNavContext } from './context'
import { createNavItem, type NavItemProps as BaseNavItemProps } from './create-nav-item'

const k = katachi.nav

// ── Nav ─────────────────────────────────────────────────

export type NavProps = React.ComponentPropsWithoutRef<'nav'> & {
	value?: string
	onChange?: (value: string) => void
}

export function Nav({ value, onChange, className, children, ...props }: NavProps) {
	const ctx = useMemo<NavContextValue>(() => ({ value, onChange }), [value, onChange])

	return (
		<NavProvider value={ctx}>
			<ActiveIndicatorScope>
				<nav data-slot="nav" className={className} {...props}>
					{children}
				</nav>
			</ActiveIndicatorScope>
		</NavProvider>
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

const BaseNavItem = createNavItem({ slotPrefix: 'nav', variants: () => cn(k.item) })

export type NavItemProps = BaseNavItemProps & { value?: string }

export function NavItem({ value, current, onClick, ...props }: NavItemProps) {
	const ctx = useNavContext()

	const isCurrent = current ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
		onClick?.(e)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return <BaseNavItem current={isCurrent} onClick={handleClick} {...props} />
}

// ── NavContent ──────────────────────────────────────────

export type NavContentProps = React.ComponentPropsWithoutRef<'div'>

export function NavContent({ className, ...props }: NavContentProps) {
	return <div data-slot="nav-content" className={className} {...props} />
}

// ── NavItemContent ──────────────────────────────────────

export type NavItemContentProps = React.ComponentPropsWithoutRef<'div'> & {
	value: string
}

export function NavItemContent({ value, className, ...props }: NavItemContentProps) {
	const ctx = useNavContext()

	if (ctx?.value !== undefined && ctx.value !== value) {
		return null
	}

	return <div data-slot="nav-item-content" className={className} {...props} />
}
