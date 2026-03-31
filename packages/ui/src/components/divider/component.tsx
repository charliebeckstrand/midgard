import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../core'
import { kage } from '../../recipes'

export const dividerVariants = cva('border-0', {
	variants: {
		orientation: {
			horizontal: 'w-full border-t',
			vertical: 'self-stretch border-l',
		},
		soft: {
			true: kage.usui,
			false: kage.base,
		},
	},
	defaultVariants: {
		orientation: 'horizontal',
		soft: false,
	},
})

export type DividerVariants = VariantProps<typeof dividerVariants>

export type DividerProps = DividerVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'hr'>, 'className'>

export function Divider({ orientation, soft, className, ...props }: DividerProps) {
	return (
		<hr
			data-slot="divider"
			role={orientation === 'vertical' ? 'separator' : undefined}
			aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
			className={cn(dividerVariants({ orientation, soft }), className)}
			{...props}
		/>
	)
}
