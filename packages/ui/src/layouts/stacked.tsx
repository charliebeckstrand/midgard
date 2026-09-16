import type { PropsWithChildren, Ref } from 'react'
import { Stack } from '../components/stack'
import { cn } from '../core'

/** Props for {@link StackedLayout}: the header, body, and footer slots to stack. */
export type StackedLayoutProps = PropsWithChildren<{
	className?: string
}>

/**
 * Vertically stacked page layout: a min-height-collapsing {@link Stack} column
 * that hosts {@link StackedLayoutHeader}, {@link StackedLayoutBody}, and
 * {@link StackedLayoutFooter}. The header and footer stay fixed-height while the
 * body flexes and scrolls.
 */
export function StackedLayout({ children, className }: StackedLayoutProps) {
	return (
		<Stack gap="lg" className={cn('min-h-0', className)}>
			{children}
		</Stack>
	)
}

/** Props for {@link StackedLayoutHeader}. */
export type StackedLayoutHeaderProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

/** Fixed-height header slot for {@link StackedLayout} (`data-slot="header"`). */
export function StackedLayoutHeader({ ref, children, className }: StackedLayoutHeaderProps) {
	return (
		<header ref={ref} data-slot="header" className={cn('shrink-0', className)}>
			{children}
		</header>
	)
}

/** Props for {@link StackedLayoutBody}; `ref` reaches the scrolling `<main>`. */
export type StackedLayoutBodyProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

/**
 * Flexible, vertically scrolling main slot for {@link StackedLayout}
 * (`data-slot="body"`). Takes the remaining height between header and footer.
 */
export function StackedLayoutBody({ ref, children, className }: StackedLayoutBodyProps) {
	return (
		<main ref={ref} data-slot="body" className={cn('flex-1 min-h-0 overflow-y-auto', className)}>
			{children}
		</main>
	)
}

/** Props for {@link StackedLayoutFooter}. */
export type StackedLayoutFooterProps = PropsWithChildren<{
	className?: string
	ref?: Ref<HTMLElement>
}>

/** Fixed-height footer slot for {@link StackedLayout} (`data-slot="footer"`). */
export function StackedLayoutFooter({ ref, children, className }: StackedLayoutFooterProps) {
	return (
		<footer ref={ref} data-slot="footer" className={cn('shrink-0', className)}>
			{children}
		</footer>
	)
}
