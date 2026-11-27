'use client'

import { useComposedRefs } from 'motion/react'
import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { Landmark } from '../../primitives/landmark'
import { k } from '../../recipes/kata/stacked-layout'

/** Props for {@link StackedLayoutBody} (`<main>` attributes); `ref` reaches the scrolling element. */
export type StackedLayoutBodyProps = ComponentProps<'main'>

/**
 * Flexible, vertically scrolling main slot for {@link StackedLayout}
 * (`data-slot="body"`). Takes the remaining height between header and footer.
 * It scrolls only when a parent bounds the height of {@link StackedLayout}.
 * It is the containing block of each positioned element in it, so the scroll
 * clips them and they do not make the page taller. In print, it does not
 * scroll, so it prints whole. Inside the main slot of
 * another layout, it renders a `<div>`, so the page keeps one main landmark.
 *
 * @remarks Client component. While the body scrolls, it is a tab stop
 * ({@link useScrollRegion}), so a keyboard can scroll content that has no
 * control in it. It keeps its main landmark and takes no name of its own.
 */
export function StackedLayoutBody({ className, ref, ...props }: StackedLayoutBodyProps) {
	const scrollRegionRef = useScrollRegion()

	const composedRef = useComposedRefs<HTMLElement>(scrollRegionRef, ref)

	return (
		<Landmark
			as="main"
			data-slot="body"
			{...props}
			ref={composedRef}
			className={cn(k().body, className)}
		/>
	)
}
