import type { ComponentProps } from 'react'
import { cn, createSlot } from '../core'
import { Landmark } from '../primitives/landmark'
import { Stack } from '../structure/stack'

/** Props for {@link StackedLayout}: the header, body, and footer slots to stack. The `<div>` takes the rest. */
export type StackedLayoutProps = ComponentProps<'div'>

/**
 * Vertically stacked page layout: a min-height-collapsing {@link Stack} column
 * that hosts {@link StackedLayoutHeader}, {@link StackedLayoutBody}, and
 * {@link StackedLayoutFooter}. The header and footer stay fixed-height while the
 * body flexes and scrolls.
 */
export function StackedLayout({ className, ...props }: StackedLayoutProps) {
	return (
		<Stack data-slot="stacked-layout" gap="lg" {...props} className={cn('min-h-0', className)} />
	)
}

// The header and the footer are element + `data-slot` + class composition,
// which is what `createSlot` is for. `ref` and each native attribute reach the
// element. The body picks its element through `Landmark`, so it is a
// function.

/** Props for {@link StackedLayoutHeader} (`<header>` attributes). */
export type StackedLayoutHeaderProps = ComponentProps<'header'>

/** Fixed-height header slot for {@link StackedLayout} (`data-slot="header"`). */
export const StackedLayoutHeader = createSlot('header', 'header', 'shrink-0')

/** Props for {@link StackedLayoutBody} (`<main>` attributes); `ref` reaches the scrolling element. */
export type StackedLayoutBodyProps = ComponentProps<'main'>

/**
 * Flexible, vertically scrolling main slot for {@link StackedLayout}
 * (`data-slot="body"`). Takes the remaining height between header and footer.
 * Inside the main slot of another layout, it renders a `<div>`, so the page
 * keeps one main landmark.
 */
export function StackedLayoutBody({ className, ...props }: StackedLayoutBodyProps) {
	return (
		<Landmark
			as="main"
			data-slot="body"
			className={cn('flex-1 min-h-0 overflow-y-auto', className)}
			{...props}
		/>
	)
}

/** Props for {@link StackedLayoutFooter} (`<footer>` attributes). */
export type StackedLayoutFooterProps = ComponentProps<'footer'>

/** Fixed-height footer slot for {@link StackedLayout} (`data-slot="footer"`). */
export const StackedLayoutFooter = createSlot('footer', 'footer', 'shrink-0')
