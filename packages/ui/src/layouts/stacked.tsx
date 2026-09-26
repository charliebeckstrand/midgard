import type { ComponentProps, PropsWithChildren } from 'react'
import { cn, createSlot } from '../core'
import { Stack } from '../structure/stack'

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

// Each slot is element + `data-slot` + class composition, which is what
// `createSlot` is for. It also carries `ref` and every native attribute of the
// element, so these three take the same surface the structure roots took.

/** Props for {@link StackedLayoutHeader} (`<header>` attributes). */
export type StackedLayoutHeaderProps = ComponentProps<'header'>

/** Fixed-height header slot for {@link StackedLayout} (`data-slot="header"`). */
export const StackedLayoutHeader = createSlot('header', 'header', 'shrink-0')

/** Props for {@link StackedLayoutBody} (`<main>` attributes); `ref` reaches the scrolling `<main>`. */
export type StackedLayoutBodyProps = ComponentProps<'main'>

/**
 * Flexible, vertically scrolling main slot for {@link StackedLayout}
 * (`data-slot="body"`). Takes the remaining height between header and footer.
 */
export const StackedLayoutBody = createSlot('main', 'body', 'flex-1 min-h-0 overflow-y-auto')

/** Props for {@link StackedLayoutFooter} (`<footer>` attributes). */
export type StackedLayoutFooterProps = ComponentProps<'footer'>

/** Fixed-height footer slot for {@link StackedLayout} (`data-slot="footer"`). */
export const StackedLayoutFooter = createSlot('footer', 'footer', 'shrink-0')
