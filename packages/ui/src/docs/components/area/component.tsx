import type React from 'react'
import { cn } from '../../../core'
import {
	type AreaBorder,
	type AreaMargin,
	type AreaPadding,
	borderMap,
	marginMap,
	mxMap,
	myMap,
	paddingMap,
	pxMap,
	pyMap,
	radius,
} from './variants'

export type AreaProps = {
	/** Padding on all sides. */
	p?: AreaPadding
	/** Horizontal padding. Overrides p. */
	px?: AreaPadding
	/** Vertical padding. Overrides p. */
	py?: AreaPadding
	/** Margin on all sides. */
	m?: AreaMargin
	/** Horizontal margin. Overrides m. */
	mx?: AreaMargin
	/** Vertical margin. Overrides m. */
	my?: AreaMargin
	/** Border style. Defaults to `dashed`. */
	border?: AreaBorder
	grow?: boolean
	center?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/** Neutral outline for visualizing layout bounds in demos and docs. */
export function Area({
	p = 3,
	px,
	py,
	m,
	mx,
	my,
	border = 'solid',
	grow = true,
	center = false,
	className,
	children,
	...props
}: AreaProps) {
	return (
		<div
			data-slot="area"
			className={cn(
				'flex',
				radius,
				grow && 'flex-1 h-full',
				center && 'items-center justify-center',
				p !== undefined && paddingMap[p],
				px !== undefined && pxMap[px],
				py !== undefined && pyMap[py],
				m !== undefined && marginMap[m],
				mx !== undefined && mxMap[mx],
				my !== undefined && myMap[my],
				borderMap[border],
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}
