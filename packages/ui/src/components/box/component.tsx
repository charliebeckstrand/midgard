import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import {
	type BoxBg,
	type BoxBorder,
	type BoxMargin,
	type BoxPadding,
	type BoxRadius,
	bgMap,
	borderMap,
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
	/** Horizontal padding. Overrides `p` on the x-axis. */
	px?: BoxPadding
	/** Vertical padding. Overrides `p` on the y-axis. */
	py?: BoxPadding
	/** Margin on all sides. */
	m?: BoxMargin
	/** Horizontal margin. Overrides `m` on the x-axis. */
	mx?: BoxMargin
	/** Vertical margin. Overrides `m` on the y-axis. */
	my?: BoxMargin
	/** Border radius token. */
	radius?: BoxRadius
	/** Background surface token. */
	bg?: BoxBg
	/** Border. `true` uses the default token; pass `'subtle'` / `'strong'` to pick a weight. */
	border?: BoxBorder
	className?: string
}

export type BoxProps = BoxBaseProps & PolymorphicProps<'div'>

function resolveBorder(border: BoxBorder | undefined): string | readonly string[] | undefined {
	if (!border) return undefined
	if (border === true) return borderMap.default
	return borderMap[border]
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
	border,
	className,
	href,
	children,
	...props
}: BoxProps) {
	return (
		<Polymorphic
			as="div"
			dataSlot="box"
			href={href}
			className={cn(
				p !== undefined && paddingMap[p],
				px !== undefined && pxMap[px],
				py !== undefined && pyMap[py],
				m !== undefined && marginMap[m],
				mx !== undefined && mxMap[mx],
				my !== undefined && myMap[my],
				radius && radiusMap[radius],
				bg && bgMap[bg],
				resolveBorder(border),
				className,
			)}
			{...props}
		>
			{children}
		</Polymorphic>
	)
}
