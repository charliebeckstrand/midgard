'use client'

import type { ScaleStep } from '../../core/density'
import type { FloatingPlacement } from '../../hooks'
import type { scale } from '../../recipes/kata/color-picker'
import type { GroupStampProps } from '../../types/group-stamp'
import { type ColorPanel, ColorPanelView } from './color-panel'
import { ColorPickerContent } from './color-picker-content'
import { ColorPickerTrigger } from './color-picker-trigger'
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
	 * Preset swatches as hex colors, or `false` to hide them. Passed through to the
	 * inline {@link ColorPanel}, which takes `#rgb`, `#rgba`, `#rrggbb`, and
	 * `#rrggbbaa`, and warns in development of any other swatch.
	 *
	 * @defaultValue The {@link ColorPanel} default palette.
	 */
	swatches?: readonly string[] | false
	/**
	 * The side and the alignment of the panel. A `<side>-auto` value, such as
	 * `'bottom-auto'`, aligns the panel to the edge of the trigger that is nearer
	 * to the edge of the viewport.
	 * @defaultValue 'bottom-start'
	 */
	placement?: FloatingPlacement
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
	/**
	 * Blocks the open of the panel, so the color cannot change. An explicit value
	 * wins over the `readOnly` of an enclosing Control. The trigger stays
	 * focusable and keeps its tab stop, so a keyboard or a screen reader can read
	 * the color. A press, Enter, or Space does not open the panel. A button does
	 * not take `aria-readonly`, so the trigger sets `aria-disabled` while the panel
	 * is closed. A panel that is open when `readOnly` turns on can still close.
	 */
	readOnly?: boolean
	className?: string
}

/** Props for {@link ColorPicker}: presentation and placement options plus format-discriminated value props. */
export type ColorPickerProps = ColorPickerBaseProps & ColorValueProps

/**
 * Popover color picker: a Control-integrated swatch trigger that opens a
 * floating {@link ColorPanel}. The trigger swatch and the panel share one HSVA,
 * which keeps its full precision and its hue after the panel closes. It speaks
 * a hex string (default) or an HSVA object per `format`. It positions via
 * Floating UI (`placement`). It takes the step of the nearest density scope,
 * and an explicit `size` opens a scope on the trigger and on the panel.
 * Controlled or uncontrolled.
 *
 * The trigger is as wide as its swatch and its color value. It does not fill
 * its parent, and it does not get wider than its parent. Pass a `className`
 * such as `w-full` to make it fill the parent.
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
		readOnly,
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
		readOnly,
	})

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
				dialogId={state.dialogId}
				describedBy={state.describedBy}
				setReference={state.setReference}
				getReferenceProps={state.getReferenceProps}
				hsva={state.hsva}
				alpha={alpha}
				size={size}
				disabled={state.disabled}
				readOnly={state.readOnly}
				validation={state.validation}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
			/>
			<ColorPickerContent
				open={state.open}
				id={state.dialogId}
				setFloating={state.setFloating}
				floatingStyles={state.floatingStyles}
				getFloatingProps={state.getFloatingProps}
				context={state.context}
				size={size}
			>
				{/* The picker owns the color, and the panel reads and writes its HSVA
				    with no wire round trip. */}
				<ColorPanelView
					hsva={state.hsva}
					setHsva={state.setHsva}
					alpha={alpha}
					swatches={swatches}
					disabled={state.disabled}
				/>
			</ColorPickerContent>
		</div>
	)
}
