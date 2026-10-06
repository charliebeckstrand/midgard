'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/color-panel'
import { k } from '../../recipes/kata/color-panel'
import { Box } from '../../structure/box'
import { ColorArea } from './color-area'
import { ColorChannelInputs } from './color-channel-inputs'
import { DEFAULT_SWATCHES } from './color-constants'
import { ColorEyedropper } from './color-eyedropper'
import { ColorHexInput } from './color-hex-input'
import { ColorSlider } from './color-slider'
import { ColorSwatches } from './color-swatches'
import { hsvaToCss } from './color-utilities'
import { ColorPanelContext, type ColorPanelContextValue } from './context'
import type { ColorValueProps, Hsva } from './types'
import { type ColorState, useColorState } from './use-color-state'

type ColorPanelBaseProps = {
	/**
	 * Enable the alpha channel: adds the alpha slider and emits `#rrggbbaa` / an `a < 1`.
	 *
	 * @defaultValue false
	 */
	alpha?: boolean
	/**
	 * Preset swatches as hex colors, or `false` to hide them. The default is a
	 * built-in palette.
	 *
	 * @remarks
	 * Each swatch is `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`. A swatch in another
	 * CSS color format paints its chip, but the chip sets no color and is never
	 * checked. In development, the panel warns of each such swatch.
	 *
	 * @defaultValue {@link DEFAULT_SWATCHES}
	 */
	swatches?: readonly string[] | false
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the panel a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Disables the controls of the panel and hides the eyedropper.
	 * @defaultValue false
	 */
	disabled?: boolean
	className?: string
}

/** Props for {@link ColorPanel}: presentation options plus format-discriminated value props. */
export type ColorPanelProps = ColorPanelBaseProps & ColorValueProps

/**
 * Inline color picker: a saturation/brightness field with hue and optional
 * alpha sliders, hex and RGB channel inputs, and preset swatches. An eyedropper
 * joins them where the platform `EyeDropper` API exists. Holds HSVA internally
 * so drags stay lossless. It speaks a hex string (default) or an HSVA object
 * through `value`/`onValueChange` per `format`. It takes the step of the
 * nearest density scope, and an explicit `size` opens a scope on the panel.
 * Controlled or uncontrolled.
 *
 * @see {@link ColorPicker} for the popover variant.
 */
export function ColorPanel(props: ColorPanelProps) {
	const { alpha = false, swatches, size, disabled, className } = props

	const { hsva, setHsva } = useColorState({
		value: props.value,
		defaultValue: props.defaultValue,
		format: props.format ?? 'hex',
		alpha,
		// The format discriminant keeps callers' value/onValueChange paired; the
		// handler widens to both wire shapes.
		onValueChange: props.onValueChange as unknown as ((value: string | Hsva) => void) | undefined,
	})

	return (
		<ColorPanelView
			hsva={hsva}
			setHsva={setHsva}
			alpha={alpha}
			swatches={swatches}
			size={size}
			disabled={disabled}
			className={className}
		/>
	)
}

/**
 * The body of a {@link ColorPanel}, over a color state that the caller owns. A
 * `ColorPicker` gives it the HSVA of the picker, so the picker and the panel
 * share one color. Thus a hue that hex drops stays after the popover unmounts
 * the panel, and the picker serializes the color one time, at its own edge.
 *
 * @internal
 */
export function ColorPanelView({
	hsva,
	setHsva,
	alpha = false,
	swatches = DEFAULT_SWATCHES,
	size,
	disabled = false,
	className,
}: ColorPanelBaseProps & ColorState) {
	const context = useMemo<ColorPanelContextValue>(
		() => ({ hsva, setHsva, alpha, disabled }),
		[hsva, setHsva, alpha, disabled],
	)

	const previewColor = hsvaToCss(hsva, alpha)

	return (
		<ColorPanelContext value={context}>
			<Box data-slot="color-panel" density={size} className={cn(k(), className)}>
				<ColorArea />

				<div className={k.sliders}>
					<ColorSlider channel="hue" />
					{alpha && <ColorSlider channel="alpha" />}
				</div>

				<div className={cn(k.preview.row)}>
					<span
						data-slot="color-preview"
						className={cn('group', k.preview.base, alpha && k.checkerboard)}
					>
						<span className="block size-full" style={{ backgroundColor: previewColor }} />
					</span>

					<div className="min-w-0 flex-1">
						<ColorHexInput />
					</div>

					{!disabled && <ColorEyedropper />}
				</div>

				<ColorChannelInputs />

				{swatches && swatches.length > 0 && <ColorSwatches swatches={swatches} />}
			</Box>
		</ColorPanelContext>
	)
}
