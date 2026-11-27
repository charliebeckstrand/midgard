'use client'

import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { useIntl } from '../../primitives/intl/use-intl'
import type { scale } from '../../recipes/kata/color-picker'
import { k } from '../../recipes/kata/color-picker'
import {
	ControlPickerTrigger,
	type ControlPickerTriggerState,
} from '../control/control-picker-trigger'
import { useControlSurface } from '../control/use-control-surface'
import { colorMessages } from './color-messages'
import { hsvaToCss, hsvaToHex } from './color-utilities'
import type { Hsva } from './types'

type ColorPickerTriggerProps = {
	/** The state of the picker. */
	state: ControlPickerTriggerState
	hsva: Hsva
	alpha: boolean
	/**
	 * The density step of `<ColorPicker>`. Omit it to take the step of the
	 * nearest density scope. A step makes the trigger a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/** The name of the trigger when no Field label names it. */
	'aria-label'?: string
	className?: string
}

/**
 * Control-framed button showing the current color swatch and its hex value,
 * opening the picker dialog.
 *
 * @remarks It is a {@link ControlPickerTrigger}, as on DatePicker. A
 * select-only combobox takes its value from its content, so a screen reader
 * announces the hex code after the Field label or the `aria-label`. With no
 * Field label and no `aria-label`, the trigger takes the name "Color", in the
 * language of the reader.
 * @internal
 */
export function ColorPickerTrigger({
	state,
	hsva,
	alpha,
	size,
	'aria-label': ariaLabel,
	className,
}: ColorPickerTriggerProps) {
	const intl = useIntl()

	const slots = k({ variant: useControlSurface() })

	const swatchColor = hsvaToCss(hsva, alpha)

	const label = hsvaToHex(hsva, alpha).toUpperCase()

	return (
		<ControlPickerTrigger
			state={state}
			slots={slots}
			size={size}
			label={ariaLabel ?? intl.formatMessage(colorMessages.picker)}
			data-slot="color-picker-button"
			className={className}
		>
			<span
				data-slot="color-picker-swatch"
				className={cn(k.swatch.base, alpha && k.swatch.checkerboard)}
			>
				<span className={cn(k.swatch.fill)} style={{ backgroundColor: swatchColor }} />
			</span>
			<span className={cn(k.value)}>
				{/* A hex code reads left to right in each direction, so the '#' stays at the left. The
				    outer span keeps the inherited direction, so the code stays next to the swatch. A
				    translation keeps the code as it is. */}
				<span dir="ltr" translate="no">
					{label}
				</span>
			</span>
		</ControlPickerTrigger>
	)
}
