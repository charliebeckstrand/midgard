'use client'

import { useId, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/color-panel'
import { keyByOccurrence } from '../../utilities'
import { equalHsva, hexToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type ColorSwatchesProps = {
	/** Hex presets to render. */
	swatches: readonly string[]
}

/**
 * Preset color chips as a radio group; the chip that matches the current color is checked.
 *
 * @remarks
 * Each chip is a label around a native radio, so the browser gives the group
 * one Tab stop and the arrow keys. A custom color checks no chip. When the list
 * repeats a color, only the first chip of that color is checked.
 *
 * @internal
 */
export function ColorSwatches({ swatches }: ColorSwatchesProps) {
	const { hsva, setHsva, disabled } = useColorPanelContext()

	const name = useId()

	// Parse once per preset list, not once per render: an area or slider drag
	// re-renders the panel every frame and the hexes never change with it. A
	// color that the list repeats takes its occurrence in its key, so each key is unique.
	const parsedSwatches = useMemo(
		() =>
			keyByOccurrence(swatches).map(({ key, value }) => ({
				key,
				swatch: value,
				parsed: hexToHsva(value),
			})),
		[swatches],
	)

	// One radio of a group can be checked, so a repeated color checks its first chip only.
	const checkedKey = parsedSwatches.find(({ parsed }) => parsed && equalHsva(parsed, hsva))?.key

	return (
		<div data-slot="color-swatches" role="radiogroup" aria-label="Swatches" className={k.swatches}>
			{parsedSwatches.map(({ key, swatch, parsed }) => (
				<label
					key={key}
					data-slot="color-swatch"
					className={cn(k.swatch)}
					style={{ backgroundColor: swatch }}
				>
					<input
						type="radio"
						name={name}
						value={swatch}
						aria-label={swatch}
						checked={key === checkedKey}
						disabled={disabled}
						className="sr-only"
						onChange={() => parsed && setHsva(parsed)}
					/>
				</label>
			))}
		</div>
	)
}
