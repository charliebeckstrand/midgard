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

/** Preset colour chips; the chip matching the current colour reads as pressed. */
export function ColorSwatches({ swatches }: ColorSwatchesProps) {
	const { hsva, setHsva, disabled } = useColorPanelContext()

	// Parse once per preset list, not once per render: an area or slider drag
	// re-renders the panel every frame and the hexes never change with it.
	const parsedSwatches = useMemo(
		() => swatches.map((swatch) => ({ swatch, parsed: hexToHsva(swatch) })),
		[swatches],
	)

	return (
		<div data-slot="color-swatches" className={k.swatches}>
			{parsedSwatches.map(({ swatch, parsed }) => {
				const active = parsed ? equalHsva(parsed, hsva) : false

				return (
					<button
						key={swatch}
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
