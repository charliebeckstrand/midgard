'use client'

import { useId, useMemo } from 'react'
import { cn } from '../../core'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { k } from '../../recipes/kata/color-panel'
import { keyByOccurrence } from '../../utilities'
import { hexToHsva, hsvaToHex } from './color-utilities'
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
 * repeats a color, only the first chip of that color is checked. The radios have
 * no form owner, so an enclosing native form does not submit the checked chip.
 * A preset that is not hex paints its chip, but the chip sets no color and is
 * never checked. In development, the component warns of each such preset.
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
			keyByOccurrence(swatches).map(({ key, value }) => {
				const parsed = hexToHsva(value)

				// The hex of the parse, for the match below (`equalHsva`).
				return { key, swatch: value, parsed, hex: parsed && hsvaToHex(parsed, true) }
			}),
		[swatches],
	)

	// A preset that is not hex fails with no signal, so warn in development. The
	// text changes only with the rejected presets, so a new array of the same
	// presets does not warn again.
	const nonHexWarning = useMemo(() => {
		const rejected = parsedSwatches.flatMap(({ swatch, parsed }) =>
			parsed ? [] : [JSON.stringify(swatch)],
		)

		return rejected.length > 0
			? `ColorPanel: \`swatches\` takes hex colors only (#rgb, #rgba, #rrggbb, #rrggbbaa). These presets do not parse: ${rejected.join(', ')}. Their chips paint, but they set no color and are never checked.`
			: ''
	}, [parsedSwatches])

	useDevWarning(nonHexWarning !== '', nonHexWarning)

	// One radio of a group can be checked, so a repeated color checks its first chip only.
	// Two colors match when their hexes match (`equalHsva`), so the current color
	// converts one time for each render.
	const currentHex = hsvaToHex(hsva, true)

	const checkedKey = parsedSwatches.find(({ hex }) => hex === currentHex)?.key

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
						// ColorPanel takes no `name`, so a form must not submit these radios.
						// An empty `form` gives each radio no form owner. The radios stay one
						// group, because they have the same name and no form owner.
						form=""
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
