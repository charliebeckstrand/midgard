import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'
import { sumi } from '../../recipes'

export const textVariants = cva('', {
	variants: {
		variant: {
			default: sumi.base,
			muted: sumi.muted,
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

export type TextVariants = VariantProps<typeof textVariants>

export type TextProps = TextVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Text({ variant, className, ...props }: TextProps) {
	return <p data-slot="text" className={cn(textVariants({ variant }), className)} {...props} />
}
