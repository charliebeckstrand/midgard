'use client'

import type { Placement } from '@floating-ui/react'
import { useDensity } from '../../primitives/density'
import { useSkeleton } from '../../providers/skeleton'
import type { ControlSize } from '../control/context'
import { ControlSkeleton } from '../control/control-skeleton'
import { ColorPanel, type ColorPanelProps } from './color-panel'
import { ColorPickerContent } from './color-picker-content'
import { ColorPickerTrigger } from './color-picker-trigger'
import { serializeColor, toHsva } from './color-utilities'
import type { Hsva } from './types'
import { useColorPickerState } from './use-color-picker-state'

type ColorPickerBaseProps = {
	/** Enable the alpha channel — adds the alpha slider and emits `#rrggbbaa` / an `a < 1`. @default false */
	alpha?: boolean
	/** Preset swatches, or `false` to hide them. Defaults to a built-in palette. */
	swatches?: readonly string[] | false
	/** Show the eyedropper button where the `EyeDropper` API is available. @default true */
	eyedropper?: boolean
	placement?: Placement
	/** Size step; resolves through the explicit prop, then `<Control>`, then Density, then `'md'`. */
	size?: ControlSize
	disabled?: boolean
	className?: string
	'data-group'?: string
	'data-group-orientation'?: string
}

type ColorPickerHexProps = {
	format?: 'hex'
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
}

type ColorPickerHsvaProps = {
	format: 'hsva'
	value?: Hsva
	defaultValue?: Hsva
	onValueChange?: (value: Hsva) => void
}

export type ColorPickerProps = ColorPickerBaseProps & (ColorPickerHexProps | ColorPickerHsvaProps)

/**
 * Popover colour picker — a Control-integrated swatch trigger that opens a
 * floating `ColorPanel`. Controlled or uncontrolled, speaking a hex string
 * (default) or an HSVA object per `format`; `size` resolves through the
 * explicit prop, then `<Control>`, then Density, then `'md'`.
 */
export function ColorPicker(props: ColorPickerProps) {
	const skeleton = useSkeleton()
	const inherited = useDensity()

	const size = props.size ?? inherited.size

	if (skeleton) {
		return <ControlSkeleton size={props.size} className={props.className} />
	}

	return <ColorPickerInner {...props} size={size} />
}

function ColorPickerInner(props: ColorPickerProps & { size: ControlSize }) {
	const {
		alpha = false,
		swatches,
		eyedropper = true,
		placement = 'bottom-start',
		size,
		disabled = false,
		className,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const format = props.format ?? 'hex'

	const state = useColorPickerState({
		value: props.value,
		defaultValue: props.defaultValue,
		format,
		alpha,
		// See ColorPanel — the format discriminant is erased into a widened handler.
		onValueChange: props.onValueChange as unknown as ((value: string | Hsva) => void) | undefined,
		placement,
		disabled,
	})

	// The picker owns the colour; the inline panel is driven as a controlled
	// child. The format union is rebuilt at runtime, so the prop bag is asserted
	// back into shape.
	const panelProps = {
		format,
		value: serializeColor(state.hsva, format, alpha),
		onValueChange: (next: string | Hsva) => state.setHsva(toHsva(next) ?? state.hsva),
		alpha,
		...(swatches !== undefined ? { swatches } : {}),
		eyedropper,
		size,
		disabled,
	} as ColorPanelProps

	return (
		<div className="contents">
			<ColorPickerTrigger
				open={state.open}
				onOpenChange={state.onOpenChange}
				triggerId={state.triggerId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				hsva={state.hsva}
				alpha={alpha}
				size={size}
				disabled={state.disabled}
				required={state.required}
				invalid={state.invalid}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			/>
			<ColorPickerContent
				open={state.open}
				setFloating={state.setFloating}
				floatingStyles={state.floatingStyles}
				getFloatingProps={state.getFloatingProps}
				context={state.context}
				size={size}
			>
				<ColorPanel {...panelProps} />
			</ColorPickerContent>
		</div>
	)
}
