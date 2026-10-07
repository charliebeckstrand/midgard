import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/toggle'

/** Props for {@link ToggleField}: the standard `div` attributes. */
export type ToggleFieldProps = ComponentProps<'div'>

/**
 * Single row inside a {@link ToggleGroup}, laying out one control alongside its
 * label. When the control is disabled, the row dims the label.
 */
export function ToggleField({ className, ...props }: ToggleFieldProps) {
	return <div data-slot="field" className={cn(k.field, className)} {...props} />
}
