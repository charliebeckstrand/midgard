'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives'
import { katachi } from '../../recipes'
import { useNavbar } from '../navbar/context'
import { type NavContextValue, NavProvider, useNavContext } from './context'
import { type NavItemProps as BaseNavItemProps, createNavItem } from './create-nav-item'

const k = katachi.nav

// ── Nav ─────────────────────────────────────────────────

export type NavProps = Omit<React.ComponentPropsWithoutRef<'nav'>, 'onChange'> & {
	value?: string
	onChange?: (value: string) => void
}

export function Nav({ value, onChange, className, children, ...props }: NavProps) {
	const ctx = useMemo<NavContextValue>(() => ({ value, onChange }), [value, onChange])

	return (
		<NavProvider value={ctx}>
			<nav data-slot="nav" className={className} {...props}>
				{children}
			</nav>
		</NavProvider>
	)
}

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

// ── NavItem ─────────────────────────────────────────────

const BaseNavItem = createNavItem({ slotPrefix: 'nav', variants: () => cn(k.item) })

export type NavItemProps = BaseNavItemProps & { value?: string }

export function NavItem({ value, current, onClick, ...props }: NavItemProps) {
	const ctx = useNavContext()

	const isCurrent = current ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: React.MouseEvent<HTMLElement>) {
		onClick?.(e as React.MouseEvent<HTMLButtonElement> & React.MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return <BaseNavItem current={isCurrent} onClick={handleClick} {...props} />
}

// ── NavContents ─────────────────────────────────────────

export type NavContentsProps = React.ComponentPropsWithoutRef<'div'>

export function NavContents({ className, ...props }: NavContentsProps) {
	return <div data-slot="nav-contents" className={className} {...props} />
}

// ── NavContent ──────────────────────────────────────────

export type NavContentProps = React.ComponentPropsWithoutRef<'div'> & {
	value?: string
}

export function NavContent({ value, className, ...props }: NavContentProps) {
	const ctx = useNavContext()

	if (value !== undefined && ctx?.value !== undefined && ctx.value !== value) {
		return null
	}

	return <div data-slot="nav-content" className={className} {...props} />
}
