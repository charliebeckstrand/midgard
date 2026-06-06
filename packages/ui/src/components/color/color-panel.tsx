'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import { k } from '../../recipes/kata/color-panel'
import type { ControlSize } from '../control/context'
import { ColorArea } from './color-area'
import { DEFAULT_SWATCHES } from './color-constants'
import { ColorEyedropper } from './color-eyedropper'
import { ColorInputs } from './color-inputs'
import { ColorPanelSkeleton } from './color-panel-skeleton'
import { ColorSlider } from './color-slider'
import { ColorSwatches } from './color-swatches'
import { hsvaToCss } from './color-utilities'
import { ColorPanelContext, type ColorPanelContextValue } from './context'
import type { Hsva } from './types'
import { useColorState } from './use-color-state'

type ColorPanelBaseProps = {
	/** Enable the alpha channel — adds the alpha slider and emits `#rrggbbaa` / an `a < 1`. @default false */
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

type ColorPanelHexProps = {
	format?: 'hex'
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
}

type ColorPanelHsvaProps = {
	format: 'hsva'
	value?: Hsva
	defaultValue?: Hsva
	onValueChange?: (value: Hsva) => void
}

export type ColorPanelProps = ColorPanelBaseProps & (ColorPanelHexProps | ColorPanelHsvaProps)

/**
 * Inline colour picker — a saturation/brightness field with hue (and optional
 * alpha) sliders, hex / RGB inputs, preset swatches, and an eyedropper. Holds
 * HSVA internally so dragging stays lossless, and speaks either a hex string
 * (default) or an HSVA object through `value` / `onValueChange` per `format`.
 */
export function ColorPanel(props: ColorPanelProps) {
	const skeleton = useSkeleton()
	const inherited = useDensity()

	const size = props.size ?? inherited.size

	if (skeleton) {
		return <ColorPanelSkeleton size={props.size} className={props.className} />
	}

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
		// hook works in HSVA, so the handler widens to both wire shapes here.
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

				<div className={k.controls}>
					<span
						data-slot="color-preview"
						className={cn(k.preview({ size }), alpha && k.checkerboard)}
					>
						<span className="block size-full" style={{ backgroundColor: previewColor }} />
					</span>

					<div className={k.sliders}>
						<ColorSlider channel="hue" />
						{alpha && <ColorSlider channel="alpha" />}
					</div>

					{eyedropper && !disabled && <ColorEyedropper />}
				</div>

				<ColorInputs />

				{swatches && swatches.length > 0 && <ColorSwatches swatches={swatches} />}
			</div>
		</ColorPanelContext>
	)
}
