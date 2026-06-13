'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/color-panel'
import type { ControlSize } from '../control/context'
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
import { useColorState } from './use-color-state'

type ColorPanelBaseProps = {
	/** Enable the alpha channel: adds the alpha slider and emits `#rrggbbaa` / an `a < 1`. @default false */
	alpha?: boolean
	/** Preset swatches, or `false` to hide them. Defaults to a built-in palette. */
	swatches?: readonly string[] | false
	/** Show the eyedropper button where the `EyeDropper` API is available. @default true */
	eyedropper?: boolean
	/** Size step; resolves through the explicit prop, then the Density cascade, then `'md'`. */
	size?: ControlSize
	disabled?: boolean
	className?: string
}

/** Props for {@link ColorPanel}: presentation options plus format-discriminated value props. */
export type ColorPanelProps = ColorPanelBaseProps & ColorValueProps

/**
 * Inline color picker: a saturation/brightness field with hue and optional
 * alpha sliders, hex and RGB channel inputs, preset swatches, and an eyedropper
 * where the platform `EyeDropper` API exists. Holds HSVA internally so drags
 * stay lossless, speaks a hex string (default) or an HSVA object through
 * `value`/`onValueChange` per `format`, and resolves `size` against enclosing
 * Density. Controlled or uncontrolled.
 *
 * @see {@link ColorPicker} for the popover variant.
 */
export function ColorPanel(props: ColorPanelProps) {
	const inherited = useDensity()

	const size = props.size ?? inherited.size

	return <ColorPanelInner {...props} size={size} />
}

function ColorPanelInner(props: ColorPanelProps & { size: ControlSize }) {
	const {
		alpha = false,
		swatches = DEFAULT_SWATCHES,
		eyedropper = true,
		size,
		disabled = false,
		className,
	} = props

	const { hsva, setHsva } = useColorState({
		value: props.value,
		defaultValue: props.defaultValue,
		format: props.format ?? 'hex',
		alpha,
		// The format discriminant keeps callers' value/onValueChange paired; the
		// handler widens to both wire shapes.
		onValueChange: props.onValueChange as unknown as ((value: string | Hsva) => void) | undefined,
	})

	const context = useMemo<ColorPanelContextValue>(
		() => ({ hsva, setHsva, alpha, disabled, size }),
		[hsva, setHsva, alpha, disabled, size],
	)

	const previewColor = hsvaToCss(hsva, alpha)

	return (
		<ColorPanelContext value={context}>
			<div data-slot="color-panel" className={cn(k({ size }), className)}>
				<ColorArea />

				<div className={k.sliders}>
					<ColorSlider channel="hue" />
					{alpha && <ColorSlider channel="alpha" />}
				</div>

				<div className={cn(k.previewRow)}>
					<span
						data-slot="color-preview"
						className={cn('group', k.preview({ size }), alpha && k.checkerboard)}
					>
						<span className="block size-full" style={{ backgroundColor: previewColor }} />
					</span>

					<div className="min-w-0 flex-1">
						<ColorHexInput />
					</div>

					{eyedropper && !disabled && <ColorEyedropper />}
				</div>

				<ColorChannelInputs />

				{swatches && swatches.length > 0 && <ColorSwatches swatches={swatches} />}
			</div>
		</ColorPanelContext>
	)
}
