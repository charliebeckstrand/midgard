'use client'

import type { RefCallback } from 'react'
import { cn, dataAttr, type ValidationAttrs } from '../../core'
import type { ControlStep } from '../../core/density'
import { ControlFrame } from '../../primitives/control'
import { useGlass } from '../../providers/glass/context'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/color-picker'
import type { GroupStampProps } from '../../types/group-stamp'
import { Button } from '../button'
import { hsvaToCss, hsvaToHex } from './color-utilities'
import type { Hsva } from './types'

type ColorPickerTriggerProps = GroupStampProps & {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
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
	size?: ControlStep
	disabled?: boolean
	/** The resolved validation attributes. The frame paints its ring from them. */
	validation?: ValidationAttrs
	className?: string
}

/**
 * Control-framed button showing the current color swatch and its hex value,
 * opening the picker dialog.
 *
 * @remarks The trigger is a plain button, and a button does not take
 * `aria-required`. So a required Control puts no required state on it.
 * @internal
 */
export function ColorPickerTrigger({
	open,
	onOpenChange,
	triggerId,
	describedBy,
	setReference,
	getReferenceProps,
	hsva,
	alpha,
	size,
	disabled = false,
	validation,
	className,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
}: ColorPickerTriggerProps) {
	const glass = useGlass()

	const swatchColor = hsvaToCss(hsva, alpha)

	const label = hsvaToHex(hsva, alpha).toUpperCase()

	return (
		// An explicit `size` makes the trigger a density scope. Without it, the
		// stepped classes of the control bridge take the step of the nearest scope.
		<div
			data-slot="control"
			data-density={size}
			ref={setReference}
			className={cn(className)}
			{...getReferenceProps()}
		>
			<ControlFrame
				data-open={dataAttr(open)}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
				className={cn(k.surface[glass ? 'glass' : 'default'])}
			>
				<HeadlessProvider>
					<Button
						type="button"
						id={triggerId}
						aria-haspopup="dialog"
						aria-expanded={open}
						aria-describedby={describedBy}
						data-slot="color-picker-button"
						disabled={disabled}
						{...validation}
						onClick={() => onOpenChange(!open)}
						className={cn(k.button())}
					>
						<span data-slot="color-picker-swatch" className={cn(k.swatch, alpha && k.checkerboard)}>
							<span className="block size-full" style={{ backgroundColor: swatchColor }} />
						</span>
						<span className={cn(k.value({ truncate: true }), 'min-w-0 flex-1 font-mono')}>
							{label}
						</span>
					</Button>
				</HeadlessProvider>
			</ControlFrame>
		</div>
	)
}
