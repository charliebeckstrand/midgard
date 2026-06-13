'use client'

import type { Placement } from '@floating-ui/react'
import { useDensity } from '../../primitives/density'
import type { ControlSize } from '../control/context'
import { ColorPanel, type ColorPanelProps } from './color-panel'
import { ColorPickerContent } from './color-picker-content'
import { ColorPickerTrigger } from './color-picker-trigger'
import { serializeColor, toHsva } from './color-utilities'
import type { ColorValueProps, Hsva } from './types'
import { useColorPickerState } from './use-color-picker-state'

type ColorPickerBaseProps = {
	/** Enable the alpha channel: adds the alpha slider and emits `#rrggbbaa` / an `a < 1`. @default false */
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

/** Props for {@link ColorPicker}: presentation and placement options plus format-discriminated value props. */
export type ColorPickerProps = ColorPickerBaseProps & ColorValueProps

/**
 * Popover color picker: a Control-integrated swatch trigger that opens a
 * floating {@link ColorPanel}, which it drives as a controlled child. Reflects
 * the current color in the trigger swatch, speaks a hex string (default) or an
 * HSVA object per `format`, positions via Floating UI (`placement`), and
 * resolves `size` through the explicit prop, then `<Control>`, then Density,
 * then `'md'`. Controlled or uncontrolled.
 *
 * @see {@link ColorPanel} for the inline variant.
 */
export function ColorPicker(props: ColorPickerProps) {
	const inherited = useDensity()

	const size = props.size ?? inherited.size

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
		// As in ColorPanel: the format discriminant erases into a widened handler.
		onValueChange: props.onValueChange as unknown as ((value: string | Hsva) => void) | undefined,
		placement,
		disabled,
	})

	// The picker owns the colour and drives the inline panel as a controlled child.
	// The prop bag rebuilds the format union at runtime and asserts into shape.
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
		<>
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
		</>
	)
}
