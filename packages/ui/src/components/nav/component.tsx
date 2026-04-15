'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import {
	ActiveIndicatorScope,
	type CurrentContextValue,
	CurrentProvider,
	createCurrentContent,
	useCurrentContext,
} from '../../primitives'
import { useNavbar } from '../navbar/context'
import { type NavItemProps as BaseNavItemProps, createNavItem } from './create-nav-item'
import { k } from './variants'

// ── Nav ─────────────────────────────────────────────────

export type NavProps = Omit<React.ComponentPropsWithoutRef<'nav'>, 'onChange'> & {
	value?: string
	onChange?: (value: string) => void
}

export function Nav({ value, onChange, className, children, ...props }: NavProps) {
	const ctx = useMemo<CurrentContextValue>(() => ({ value, onChange }), [value, onChange])

	return (
		<CurrentProvider value={ctx}>
			<nav data-slot="nav" className={className} {...props}>
				{children}
			</nav>
		</CurrentProvider>
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
	const ctx = useCurrentContext()

	const isCurrent = current ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: React.MouseEvent<HTMLElement>) {
		onClick?.(e as React.MouseEvent<HTMLButtonElement> & React.MouseEvent<HTMLAnchorElement>)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return <BaseNavItem current={isCurrent} onClick={handleClick} {...props} />
}

// ── NavContents / NavContent ────────────────────────────

const { Contents: NavContents, Content: NavContent } = createCurrentContent('nav')

export { NavContent, NavContents }

export type NavContentsProps = React.ComponentPropsWithoutRef<typeof NavContents>
export type NavContentProps = React.ComponentPropsWithoutRef<typeof NavContent>
