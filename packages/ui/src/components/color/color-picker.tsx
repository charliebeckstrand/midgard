'use client'

import type { Placement } from '@floating-ui/react'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/color-picker'
import type { GroupStampProps } from '../../types/group-stamp'
import { ColorPanel, type ColorPanelProps } from './color-panel'
import { ColorPickerContent } from './color-picker-content'
import { ColorPickerTrigger } from './color-picker-trigger'
import { serializeColor, toHsva } from './color-utilities'
import type { ColorValueProps, Hsva } from './types'
import { useColorPickerState } from './use-color-picker-state'

type ColorPickerBaseProps = GroupStampProps & {
	/**
	 * Binds the color to the enclosing Form field of this name (CONVENTIONS
	 * §7.2). Seed `Form.defaultValues` in the picker's own `format`; the field's
	 * errors mark the control invalid. A bound picker ignores `defaultValue`.
	 * While the field is empty, the picker paints black.
	 */
	name?: string
	/**
	 * Enable the alpha channel: adds the alpha slider and emits `#rrggbbaa` / an `a < 1`.
	 *
	 * @defaultValue false
	 */
	alpha?: boolean
	/**
	 * Preset swatches, or `false` to hide them. Passed through to the inline {@link ColorPanel}.
	 *
	 * @defaultValue The {@link ColorPanel} default palette
	 */
	swatches?: readonly string[] | false
	/**
	 * Floating placement of the panel relative to the trigger.
	 *
	 * @defaultValue 'bottom-start'
	 */
	placement?: Placement
	/**
	 * Fires when the floating panel opens or closes, whatever drove it: the trigger, an
	 * outside press, or `Escape`.
	 *
	 * Observation only. The picker owns its open state and there is no `open` prop to pair
	 * with. Use this to mirror the state elsewhere, not to drive it.
	 */
	onOpenChange?: (open: boolean) => void
	/**
	 * The density step of the trigger and the panel. Omit it to take the step
	 * of the nearest density scope. A step makes the trigger and the panel
	 * density scopes.
	 */
	size?: ScaleStep<typeof scale>
	disabled?: boolean
	className?: string
}

/** Props for {@link ColorPicker}: presentation and placement options plus format-discriminated value props. */
export type ColorPickerProps = ColorPickerBaseProps & ColorValueProps

/**
 * Popover color picker: a Control-integrated swatch trigger that opens a
 * floating {@link ColorPanel}, which it drives as a controlled child. Reflects
 * the current color in the trigger swatch, and speaks a hex string (default) or
 * an HSVA object per `format`. It positions via Floating UI (`placement`). It
 * takes the step of the nearest density scope, and an explicit `size` opens a
 * scope on the trigger and on the panel. Controlled or uncontrolled.
 *
 * @see {@link ColorPanel} for the inline variant.
 */
export function ColorPicker(props: ColorPickerProps) {
	const {
		alpha = false,
		swatches,
		onOpenChange,
		placement = 'bottom-start',
		size,
		disabled,
		className,
		'data-group': dataGroup,
		'data-group-orientation': dataGroupOrientation,
	} = props

	const format = props.format ?? 'hex'

	const state = useColorPickerState({
		name: props.name,
		value: props.value,
		defaultValue: props.defaultValue,
		format,
		alpha,
		// As in ColorPanel: the format discriminant erases into a widened handler.
		onValueChange: props.onValueChange as unknown as ((value: string | Hsva) => void) | undefined,
		onOpenChange,
		placement,
		disabled,
	})

	// The picker owns the color and drives the inline panel as a controlled child.
	// The prop bag rebuilds the format union at runtime and asserts into shape.
	const panelProps = {
		format,
		value: serializeColor(state.hsva, format, alpha),
		onValueChange: (next: string | Hsva) => state.setHsva(toHsva(next) ?? state.hsva),
		alpha,
		swatches,
		disabled: state.disabled,
	} as ColorPanelProps

	// `display: contents` wrapper: while open, floating-ui's modal focus manager
	// inserts a hidden return-focus span as the reference's next sibling
	// (`domReference.insertAdjacentElement('afterend', …)`). Scoping it under this
	// wrapper keeps the picker a single DOM child of its parent, so a `space-y`/
	// `gap` container doesn't shift when the popover opens. `contents` adds no box
	// of its own, so flex/grid/block layout sees straight through to the control.
	// Mirrors `DatePicker`.
	return (
		<div data-slot="color-picker" className="contents">
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
				validation={state.validation}
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
