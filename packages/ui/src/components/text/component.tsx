import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.text

export const textVariants = cva('', {
	variants: { variant: k.variant },
	defaultVariants: k.defaults,
})

export type TextVariants = VariantProps<typeof textVariants>

export type TextProps = TextVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Text({ variant, className, ...props }: TextProps) {
	return <p data-slot="text" className={cn(textVariants({ variant }), className)} {...props} />
}
