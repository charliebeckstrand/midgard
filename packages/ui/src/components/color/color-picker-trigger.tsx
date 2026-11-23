'use client'

import type { RefCallback } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { cn } from '../../core/cn'
import { dataAttr } from '../../core/data-attr'
import type { ScaleStep } from '../../core/density/scale'
import type { ValidationAttrs } from '../../core/validation-attrs'
import { useIntl } from '../../primitives/intl/use-intl'
import { SelectTrigger } from '../../primitives/select-trigger'
import { HeadlessProvider } from '../../providers/headless'
import type { scale } from '../../recipes/kata/color-picker'
import { k } from '../../recipes/kata/color-picker'
import { Button } from '../button'
import { useControl } from '../control/context'
import { useControlSurface } from '../control/use-control-surface'
import { colorMessages } from './color-messages'
import { hsvaToCss, hsvaToHex } from './color-utilities'
import type { Hsva } from './types'

type ColorPickerTriggerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
	/** The id of the dialog panel. The trigger names it in `aria-controls` while open. */
	dialogId?: string
	describedBy?: string
	/** Callback ref for the trigger node; returns a cleanup, so React skips the `null` call. */
	setReference: RefCallback<HTMLElement>
	getReferenceProps: () => Record<string, unknown>
	hsva: Hsva
	alpha: boolean
	/**
	 * The density step of `<ColorPicker>`. Omit it to take the step of the
	 * nearest density scope. A step makes the trigger a density scope.
	 */
	size?: ScaleStep<typeof scale>
	disabled?: boolean
	/**
	 * The resolved `readOnly`. The trigger stays focusable and sets `aria-readonly` and
	 * `data-readonly`. The open setter of the picker refuses the open.
	 */
	readOnly?: boolean
	/** The resolved `required`. The trigger sets `aria-required`. */
	required?: boolean
	/** The name of the trigger when no Field label names it. */
	'aria-label'?: string
	/** The resolved validation attributes. The frame paints its ring from them. */
	validation?: ValidationAttrs
	className?: string
}

/**
 * Control-framed button showing the current color swatch and its hex value,
 * opening the picker dialog.
 *
 * @remarks The button has `role="combobox"`, as on DatePicker and Listbox. A
 * select-only combobox takes its value from its content, so a screen reader
 * announces the hex code after the Field label or the `aria-label`. A plain
 * button takes its name from the label and drops the hex code. The role also
 * makes `aria-required` and `aria-readonly` valid. A read-only trigger keeps
 * its tab stop, so a keyboard or a screen reader can reach it and read the
 * color. Only `disabled` sets the native `disabled` attribute. With no Field
 * label and no `aria-label`, the trigger takes the name "Color", in the
 * language of the reader.
 * @internal
 */
export function ColorPickerTrigger({
	open,
	onOpenChange,
	triggerId,
	dialogId,
	describedBy,
	setReference,
	getReferenceProps,
	hsva,
	alpha,
	size,
	disabled = false,
	readOnly = false,
	required = false,
	'aria-label': ariaLabel,
	validation,
	className,
}: ColorPickerTriggerProps) {
	const intl = useIntl()

	const slots = k({ variant: useControlSurface() })

	// A Label of the enclosing Field names the trigger through its `for`. Only
	// where no Label registers does the trigger take a name of its own.
	const labelled = useControl()?.labelledBy !== undefined

	const swatchColor = hsvaToCss(hsva, alpha)

	const label = hsvaToHex(hsva, alpha).toUpperCase()

	return (
		// An explicit `size` makes the trigger a density scope. Without it, the
		// stepped classes of the control bridge take the step of the nearest scope.
		<SelectTrigger
			open={open}
			setReference={setReference}
			getReferenceProps={getReferenceProps}
			slots={slots}
			size={size}
			className={cn(k.root, className)}
		>
			<HeadlessProvider>
				<Button
					type="button"
					id={triggerId}
					role="combobox"
					aria-label={
						labelled ? undefined : (ariaLabel ?? intl.formatMessage(colorMessages.picker))
					}
					aria-haspopup="dialog"
					aria-expanded={open}
					aria-controls={open ? dialogId : undefined}
					aria-describedby={describedBy}
					data-slot="color-picker-button"
					aria-readonly={ariaAttr(readOnly)}
					aria-required={ariaAttr(required)}
					data-readonly={dataAttr(readOnly)}
					disabled={disabled}
					data-open={dataAttr(open)}
					data-disabled={dataAttr(disabled)}
					{...validation}
					onClick={() => onOpenChange(!open)}
					className={cn(slots.field)}
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
				</Button>
			</HeadlessProvider>
		</SelectTrigger>
	)
}
