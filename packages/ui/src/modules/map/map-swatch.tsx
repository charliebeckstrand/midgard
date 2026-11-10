import type { CSSProperties } from 'react'
import { Swatch, type SwatchProps } from '../../components/swatch'
import { cn } from '../../core/cn'
import { k } from '../../recipes/kata/map'
import { readoutSwatchShapes } from '../chart/engine/chart-readout-card'
import type { MapSwatchShape } from './engine/types'

/** Props for {@link MapSwatch}. @internal */
type MapSwatchProps = {
	/** The shape of the mark the swatch keys. */
	shape: MapSwatchShape
	/** The density step; omitted, the swatch takes the step of its scope. */
	size?: SwatchProps['size']
	/** The currentColor class of the mark. */
	className?: string
	/** A raw color of the mark, inked inline on `currentColor`. */
	color?: string
	/** The currentColor class of the stripes over the fill, for a striped category. */
	stripes?: string
	/** Classes on the swatch itself, such as the dim of a toggled-off entry. */
	swatchClassName?: string
}

/**
 * The key of a map mark, in the legend and in the tooltip. A striped category
 * lays its second color over the fill in bands ({@link k.stripes}), so the
 * swatch shows the stripes that the region shows. Every other mark is a plain
 * {@link Swatch}.
 *
 * @internal
 */
export function MapSwatch({
	shape,
	size,
	className,
	color,
	stripes,
	swatchClassName,
}: MapSwatchProps) {
	const style: CSSProperties | undefined = color ? { color } : undefined

	return (
		<Swatch
			shape={readoutSwatchShapes[shape]}
			size={size}
			color={className}
			style={style}
			className={cn(stripes !== undefined && 'relative overflow-hidden', swatchClassName)}
		>
			{stripes !== undefined && (
				<span
					aria-hidden="true"
					data-slot="map-swatch-stripes"
					className={cn(k.stripes, stripes)}
				/>
			)}
		</Swatch>
	)
}
