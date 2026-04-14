import { cn } from '../../core'
import { k } from './variants'

export type PlaceholderProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

/** Pulsing skeleton shape. Defaults to a line; pass className for other shapes. */
export function Placeholder({ className, ...props }: PlaceholderProps) {
	return (
		<div data-slot="placeholder" aria-hidden="true" className={cn(k.base, className)} {...props} />
	)
}
