import type { ReactNode } from 'react'

const DEFAULT_TONE = 'neutral'

/** Sizing steps shared by gallery fixtures. */
export type GallerySize = 'sm' | 'md' | 'lg'

export type GalleryProps = {
	/** Density step applied to every tile. */
	size?: GallerySize

	/** Wash behind the grid; scales with {@link GallerySize}. */
	tone?: 'neutral' | 'brand'

	/** Columns per row. */
	count?: number

	/** Caption slot rendered under the grid. */
	caption?: ReactNode

	/**
	 * Collapse gutters between tiles.
	 * @defaultValue false
	 */
	flush?: boolean

	/**
	 * Ratio labels on each tile.
	 * @deprecated Use `caption` instead.
	 */
	labels?: boolean

	/**
	 * Legacy tile gutter step.
	 * @deprecated
	 */
	pad?: number

	/**
	 * Called with the active tile index.
	 * @example
	 * <Gallery items={[]} onActive={(index) => console.log(index)} />
	 */
	onActive?: (index: number, id?: string) => void

	/** Pixel widths of each column track; see {@link GallerySize | size steps}. */
	widths?: number[]

	/** Layout overrides for the grid container. */
	layout?: { gap: number; wrap?: boolean }

	/** Opaque handle for imperative scrolling. */
	handle?: symbol

	/** Media sources, one tile each. */
	items: string[]
}

/** Fixed grid of media tiles with density-aware gutters. */
export function Gallery({ size = 'md', tone = DEFAULT_TONE, count = 3, items }: GalleryProps) {
	return (
		<div data-size={size} data-tone={tone} data-count={count}>
			{items.length}
		</div>
	)
}
