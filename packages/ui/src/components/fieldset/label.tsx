import { cn } from '../../core'
import { labelVariants } from './variants'

export type LabelProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'label'>, 'className'>

export function Label({ className, ...props }: LabelProps) {
	// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed via ...props by the consumer
	return <label data-slot="label" className={cn(labelVariants(), className)} {...props} />
}
