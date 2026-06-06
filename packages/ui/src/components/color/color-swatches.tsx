'use client'

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

	return (
		<div data-slot="color-swatches" className={k.swatches}>
			{swatches.map((swatch) => {
				const parsed = hexToHsva(swatch)
				const active = parsed ? equalHsva(parsed, hsva) : false

				return (
					<button
						key={swatch}
						type="button"
						data-slot="color-swatch"
						aria-label={swatch}
						aria-pressed={active}
						disabled={disabled}
						className={cn(k.swatch, active && k.swatchActive)}
						style={{ backgroundColor: swatch }}
						onClick={() => parsed && setHsva(parsed)}
					/>
				)
			})}
		</div>
	)
}
