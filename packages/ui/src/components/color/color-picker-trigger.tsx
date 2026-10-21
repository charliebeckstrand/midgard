'use client'

import type { RefCallback } from 'react'
import { ariaAttr, cn, dataAttr, type ValidationAttrs } from '../../core'
import type { ScaleStep } from '../../core/density'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useGlass } from '../../providers/glass/context'
import type { scale } from '../../recipes/kata/color-picker'
import { k } from '../../recipes/kata/color-picker'
import { ButtonBase } from '../button/button-base'
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
	 * The resolved `readOnly`. The trigger stays focusable and sets `data-readonly`. While the
	 * panel is closed, it also sets `aria-disabled`. The open setter of the picker refuses the open.
	 */
	readOnly?: boolean
	/** The resolved validation attributes. The frame paints its ring from them. */
	validation?: ValidationAttrs
	className?: string
}

/**
 * Control-framed button showing the current color swatch and its hex value,
 * opening the picker dialog.
 *
 * @remarks The trigger is a plain button, and a button does not take
 * `aria-required`. So a required Control puts no required state on it. A
 * button does not take `aria-readonly` either. A read-only trigger thus keeps
 * its tab stop, and it sets `aria-disabled` while the panel is closed. A
 * keyboard or a screen reader can reach it and read the color. Only `disabled`
 * sets the native `disabled` attribute.
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
	validation,
	className,
}: ColorPickerTriggerProps) {
	const glass = useGlass()

	// A trigger in a glass overlay paints no fill, so it takes the `outline` surface.
	const slots = k({ variant: glass ? 'outline' : 'default' })

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
			<ButtonBase
				type="button"
				id={triggerId}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={open ? dialogId : undefined}
				aria-describedby={describedBy}
				data-slot="color-picker-button"
				aria-disabled={ariaAttr(readOnly && !open)}
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
				<span className={cn(k.value, 'min-w-0 flex-1 font-mono')}>
					{/* A hex code reads left to right in each direction, so the '#' stays at the left. The
						    outer span keeps the inherited direction, so the code stays next to the swatch. */}
					<span dir="ltr">{label}</span>
				</span>
			</ButtonBase>
		</SelectTrigger>
	)
}
