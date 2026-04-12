import { cn } from '../../core'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type TextVariants, textVariants } from './variants'

export type TextProps = TextVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className' | 'color'>

export function Text({ variant, color, className, ...props }: TextProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.text.base, className)} />
	}

	return (
		<p data-slot="text" className={cn(textVariants({ variant, color }), className)} {...props} />
	)
}
