'use client'

import type { Ref } from 'react'
import { cn } from '../../core'
import { useDensityNullable } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/box'
import {
	type BoxBg,
	type BoxMargin,
	type BoxOutline,
	type BoxPadding,
	type BoxRadius,
	marginMap,
	mxMap,
	myMap,
	paddingMap,
	pxMap,
	pyMap,
	radiusMap,
} from './variants'

type BoxBaseProps = {
	/** Padding on all sides. */
	p?: BoxPadding
	/** Horizontal padding. Overrides p. */
	px?: BoxPadding
	/** Vertical padding. Overrides p. */
	py?: BoxPadding
	/** Margin on all sides. */
	m?: BoxMargin
	/** Horizontal margin. Overrides m. */
	mx?: BoxMargin
	/** Vertical margin. Overrides m. */
	my?: BoxMargin
	/** Border radius token. */
	radius?: BoxRadius
	/** Background surface token. */
	bg?: BoxBg
	/** Outline. `true` uses the default token; pass `'subtle'` / `'strong'` to pick a weight. */
	outline?: BoxOutline
	/** Overrides the data-slot attribute. Defaults to "box". */
	'data-slot'?: string
	ref?: Ref<HTMLDivElement>
	className?: string
}

export type BoxProps<Omitted extends PropertyKey = never> = Omit<BoxBaseProps, Omitted> &
	PolymorphicProps<'div', Omitted>

function resolveOutline(outline: BoxOutline | undefined): string | readonly string[] | undefined {
	if (!outline) return undefined

	if (outline === true) return k.outline.default

	return k.outline[outline]
}

/** Polymorphic layout primitive for padding, margin, radius, background, and outline tokens — `p` inherits the ambient Density while `px`/`py` stay explicit. */
export function Box({
	p,
	px,
	py,
	m,
	mx,
	my,
	radius,
	bg,
	outline,
	'data-slot': slot = 'box',
	ref,
	className,
	href,
	children,
	...props
}: BoxProps) {
	const density = useDensityNullable()

	// Only `p` inherits from ambient Density — `px` / `py` stay explicit.
	const resolvedPadding = p ?? density?.space

	return (
		<Polymorphic
			as="div"
			ref={ref}
			data-slot={slot}
			href={href}
			className={cn(
				resolvedPadding !== undefined && paddingMap[resolvedPadding],
				px !== undefined && pxMap[px],
				py !== undefined && pyMap[py],
				m !== undefined && marginMap[m],
				mx !== undefined && mxMap[mx],
				my !== undefined && myMap[my],
				radius && radiusMap[radius],
				bg && k.bg[bg],
				resolveOutline(outline),
				className,
			)}
			{...props}
		>
			{children}
		</Polymorphic>
	)
}
