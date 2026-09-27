import type { ComponentProps, ReactNode } from 'react'
import { Swatch, type SwatchProps } from '../../../components/swatch'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/chart'

/** The shape of a mark, as a readout names it. @internal */
export type ReadoutSwatchShape = 'rect' | 'line' | 'dot'

/**
 * The `Swatch` shape that each mark shape reads out as, in the legends and the
 * pointer readouts of the charts and the map:
 *
 * - a square for an area: a bar, a slice, a region, a geofence
 * - a line for a line, a route, and a marker
 * - a circle for a point
 *
 * @internal
 */
export const readoutSwatchShapes = {
	rect: 'square',
	line: 'line',
	dot: 'circle',
} as const satisfies Record<ReadoutSwatchShape, NonNullable<SwatchProps['shape']>>

/** Props for {@link ReadoutSwatch}. @internal */
type ReadoutSwatchProps = {
	/** The shape of the mark. */
	shape: ReadoutSwatchShape
	/** The `currentColor` class of the mark. */
	className?: string
	/** A raw color of the mark, inked inline on `currentColor`. */
	color?: string
}

/** The small swatch that keys a readout row to its mark. @internal */
export function ReadoutSwatch({ shape, className, color }: ReadoutSwatchProps) {
	return (
		<Swatch
			shape={readoutSwatchShapes[shape]}
			size="sm"
			color={className}
			style={color ? { color } : undefined}
		/>
	)
}

/** Props for {@link ChartReadoutCard}. @internal */
type ChartReadoutCardProps = {
	/** The heading: the category, column, or place under the pointer. */
	title: ReactNode
	/** The rows under the heading, if any. */
	children?: ReactNode
}

/**
 * The body of a pointer readout: a heading over its rows. The charts, the
 * heatmap, and the map show their readouts in it.
 *
 * @remarks
 * Hidden from assistive technology. The same values are in the hidden data
 * table, so the readout is never the only channel.
 * @internal
 */
export function ChartReadoutCard({ title, children }: ChartReadoutCardProps) {
	return (
		<div aria-hidden="true">
			<div className={cn(k.label, 'whitespace-nowrap', children && 'mb-1')}>{title}</div>

			{children}
		</div>
	)
}

/** Props for {@link ChartReadoutRow}. @internal */
type ChartReadoutRowProps = Omit<ComponentProps<'div'>, 'children'> & {
	/** The key of the row, such as a {@link ReadoutSwatch}. */
	swatch: ReactNode
	/** The value. It leads the row. */
	value: ReactNode
	/** The name after the value, if any. */
	label?: ReactNode
}

/** One row of a {@link ChartReadoutCard}: the key, the value, and the name. @internal */
export function ChartReadoutRow({
	swatch,
	value,
	label,
	className,
	...props
}: ChartReadoutRowProps) {
	return (
		<div {...props} className={cn('flex items-center gap-1.5 whitespace-nowrap', className)}>
			{swatch}

			<span className={cn(k.value)}>{value}</span>

			{label !== undefined && <span className={cn(k.label)}>{label}</span>}
		</div>
	)
}
