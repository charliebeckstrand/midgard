import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { createSlot } from '../../core/create-slot'
import { Stack } from '../../structure/stack'

/** Props for {@link StackedLayout}: the header, body, and footer slots to stack. The `<div>` takes the rest. */
export type StackedLayoutProps = ComponentProps<'div'>

/**
 * Vertically stacked page layout: a min-height-collapsing {@link Stack} column
 * that hosts {@link StackedLayoutHeader}, {@link StackedLayoutBody}, and
 * {@link StackedLayoutFooter}. The header and footer stay fixed-height while the
 * body flexes. The slots have no gap between them, so a body that scrolls
 * meets the header and the footer. Put the space around the content in the
 * slots. The column takes the height of its content, so the body scrolls
 * only when a parent bounds the height of the layout (for example `h-dvh`, or a
 * flex parent with a bounded height). Under a `min-h-*` parent, the page
 * scrolls.
 *
 * @remarks For the shell of a page, give the layout the height of the viewport
 * (`h-dvh print:h-auto`). The body is then the box that scrolls, and the
 * document is never taller than the screen. Chrome on iOS collapses its
 * toolbars only on a page that is taller than the screen, and on a load of
 * such a page it draws the old page under the toolbar for a frame. In this
 * mode, the toolbars of a phone stay at their full size.
 */
export function StackedLayout({ className, ...props }: StackedLayoutProps) {
	return <Stack data-slot="stacked-layout" {...props} className={cn('min-h-0', className)} />
}

// The header and the footer are element + `data-slot` + class composition,
// which is what `createSlot` is for. `ref` and each native attribute reach the
// element. The body picks its element through `Landmark` and is a tab stop
// while it scrolls, so it is a client part (`stacked-layout-body.tsx`).

/** Props for {@link StackedLayoutHeader} (`<header>` attributes). */
export type StackedLayoutHeaderProps = ComponentProps<'header'>

/** Fixed-height header slot for {@link StackedLayout} (`data-slot="header"`). */
export const StackedLayoutHeader = createSlot('header', 'header', 'shrink-0')

/** Props for {@link StackedLayoutFooter} (`<footer>` attributes). */
export type StackedLayoutFooterProps = ComponentProps<'footer'>

/** Fixed-height footer slot for {@link StackedLayout} (`data-slot="footer"`). */
export const StackedLayoutFooter = createSlot('footer', 'footer', 'shrink-0')
