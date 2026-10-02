'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/color-panel'
import { equalHsva, hexToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type ColorSwatchesProps = {
	/** Hex presets to render. */
	swatches: readonly string[]
}

/** Preset color chips; the chip matching the current color reads as pressed. */
export function ColorSwatches({ swatches }: ColorSwatchesProps) {
	const { hsva, setHsva, disabled } = useColorPanelContext()

	// Parse once per preset list, not once per render: an area or slider drag
	// re-renders the panel every frame and the hexes never change with it. A
	// color that the list repeats takes a count in its key, so each key is unique.
	const parsedSwatches = useMemo(() => {
		const seen = new Map<string, number>()

		return swatches.map((swatch) => {
			const count = seen.get(swatch) ?? 0

			seen.set(swatch, count + 1)

			return { key: count ? `${swatch}-${count}` : swatch, swatch, parsed: hexToHsva(swatch) }
		})
	}, [swatches])

	return (
		<div data-slot="color-swatches" className={k.swatches}>
			{parsedSwatches.map(({ key, swatch, parsed }) => {
				const active = parsed ? equalHsva(parsed, hsva) : false

				return (
					<button
						key={key}
						type="button"
						data-slot="color-swatch"
						aria-label={swatch}
						aria-pressed={active}
						disabled={disabled}
						className={cn(k.swatch)}
						style={{ backgroundColor: swatch }}
						onClick={() => parsed && setHsva(parsed)}
					/>
				)
			})}
		</div>
	)
}
