import { cn } from '../../core'
import { type DividerVariants, dividerVariants } from './variants'

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
