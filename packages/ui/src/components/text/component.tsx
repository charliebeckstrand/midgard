import { cn } from '../../core'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type TextVariants, textVariants } from './variants'

export type TextProps = TextVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Text({ variant, className, ...props }: TextProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn('h-4 w-3/4', className)} />
	}

	return <p data-slot="text" className={cn(textVariants({ variant }), className)} {...props} />
}
