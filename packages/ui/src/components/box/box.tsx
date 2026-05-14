import type { Ref } from 'react'
import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps, useConcentric } from '../../primitives'
import {
	type BoxBg,
	type BoxMargin,
	type BoxOutline,
	type BoxPadding,
	type BoxRadius,
	bgMap,
	marginMap,
	mxMap,
	myMap,
	outlineMap,
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
	dataSlot?: string
	ref?: Ref<HTMLDivElement>
	className?: string
}

export type BoxProps<Omitted extends PropertyKey = never> = Omit<BoxBaseProps, Omitted> &
	PolymorphicProps<'div', Omitted>

function resolveOutline(outline: BoxOutline | undefined): string | readonly string[] | undefined {
	if (!outline) return undefined

	if (outline === true) return outlineMap.default

	return outlineMap[outline]
}

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
	dataSlot = 'box',
	ref,
	className,
	href,
	children,
	...props
}: BoxProps) {
	const concentric = useConcentric()

	// Only `p` inherits — `px` / `py` stay explicit so margin-style overrides
	// don't get masked by an ambient default.
	const resolvedP = p ?? concentric?.size

	return (
		<Polymorphic
			as="div"
			ref={ref}
			dataSlot={dataSlot}
			href={href}
			className={cn(
				resolvedP !== undefined && paddingMap[resolvedP],
				px !== undefined && pxMap[px],
				py !== undefined && pyMap[py],
				m !== undefined && marginMap[m],
				mx !== undefined && mxMap[mx],
				my !== undefined && myMap[my],
				radius && radiusMap[radius],
				bg && bgMap[bg],
				resolveOutline(outline),
				className,
			)}
			{...props}
		>
			{children}
		</Polymorphic>
	)
}
