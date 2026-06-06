'use client'

import { cn, invalidAttrs } from '../../core'
import { ControlFrame } from '../../primitives/control'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/color-picker'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { Headless } from '../headless'
import { hsvaToHex, hsvaToRgba } from './color-utilities'
import type { Hsva } from './types'

type ColorPickerTriggerProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	triggerId?: string
	describedBy?: string
	setReference: (node: HTMLElement | null) => void
	getReferenceProps: () => Record<string, unknown>
	hsva: Hsva
	alpha: boolean
	size: ControlSize
	disabled?: boolean
	required?: boolean
	invalid?: boolean
	className?: string
	'data-group'?: string
	'data-group-orientation'?: string
}

/** Control-framed button showing the current colour swatch and its hex value, opening the picker dialog. */
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
	required = false,
	invalid = false,
	className,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
}: ColorPickerTriggerProps) {
	const glass = useGlass()

	const rgba = hsvaToRgba(hsva)
	const swatchColor = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha ? rgba.a : 1})`
	const label = hsvaToHex(hsva, alpha).toUpperCase()

	return (
		<div data-slot="control" ref={setReference} className={cn(className)} {...getReferenceProps()}>
			<ControlFrame
				data-open={open || undefined}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
				className={cn(k.surface[glass ? 'glass' : 'default'])}
			>
				<Headless>
					<Button
						type="button"
						id={triggerId}
						aria-haspopup="dialog"
						aria-expanded={open}
						aria-describedby={describedBy}
						aria-required={required || undefined}
						data-slot="color-picker-button"
						disabled={disabled}
						{...invalidAttrs(invalid)}
						onClick={() => onOpenChange(!open)}
						className={cn(k.button({ density: size, size }))}
					>
						<span
							data-slot="color-picker-swatch"
							className={cn(k.swatch({ size }), alpha && k.checkerboard)}
						>
							<span className="block size-full" style={{ backgroundColor: swatchColor }} />
						</span>
						<span className={cn(k.value({ truncate: true }), 'min-w-0 flex-1 font-mono')}>
							{label}
						</span>
					</Button>
				</Headless>
			</ControlFrame>
		</div>
	)
}
