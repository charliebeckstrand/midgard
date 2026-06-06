'use client'

import { k } from '../../recipes/kata/color-panel'
import { ColorChannelInputs } from './color-channel-inputs'
import { ColorHexInput } from './color-hex-input'

/** Hex and per-channel RGB(A) entry, stacked and two-way bound to the panel's colour. */
export function ColorInputs() {
	return (
		<div data-slot="color-inputs" className={k.inputs}>
			<ColorHexInput />

			<ColorChannelInputs />
		</div>
	)
}
