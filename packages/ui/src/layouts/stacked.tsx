import type { PropsWithChildren, Ref } from 'react'
import type { ResponsiveGap } from '../components/flex/variants'
import { Stack } from '../components/stack'
import { cn } from '../core'

type StackedLayoutProps = PropsWithChildren<{
	className?: string
	/**
	 * Vertical gap between stacked children.
	 * @defaultValue 'lg'
	 */
	gap?: ResponsiveGap
}>

/**
 * Vertically stacked page layout: a min-height-collapsing {@link Stack} column
 * that hosts {@link StackedLayoutHeader}, {@link StackedLayoutBody}, and
 * {@link StackedLayoutFooter}. The header and footer stay fixed-height while the
 * body flexes and scrolls.
 */
export function StackedLayout({ gap = 'lg', children, className }: StackedLayoutProps) {
	return (
		<Stack direction="col" gap={gap} className={cn('min-h-0', className)}>
			{children}
		</Stack>
	)
}

type StackedLayoutHeaderProps = PropsWithChildren<{ className?: string }>

/** Fixed-height header slot for {@link StackedLayout} (`data-slot="header"`). */
export function StackedLayoutHeader({ children, className }: StackedLayoutHeaderProps) {
	return (
		<header data-slot="header" className={cn('shrink-0', className)}>
			{children}
		</header>
	)
}

type StackedLayoutBodyProps = PropsWithChildren<{
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

type StackedLayoutFooterProps = PropsWithChildren<{ className?: string }>

/** Fixed-height footer slot for {@link StackedLayout} (`data-slot="footer"`). */
export function StackedLayoutFooter({ children, className }: StackedLayoutFooterProps) {
	return (
		<footer data-slot="footer" className={cn('shrink-0', className)}>
			{children}
		</footer>
	)
}
