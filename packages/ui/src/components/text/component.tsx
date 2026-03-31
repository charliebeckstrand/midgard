import { cn } from '../../core'
import { type TextVariants, textVariants } from './variants'

export type TextProps = TextVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Text({ variant, className, ...props }: TextProps) {
	return <p data-slot="text" className={cn(textVariants({ variant }), className)} {...props} />
}
