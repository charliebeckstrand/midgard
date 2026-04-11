import { cn } from '../../core'
import { type ScrollAreaVariants, scrollAreaVariants } from './variants'

export type ScrollAreaProps = ScrollAreaVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function ScrollArea({ orientation, className, children, ...props }: ScrollAreaProps) {
	return (
		<div
			data-slot="scroll-area"
			className={cn(scrollAreaVariants({ orientation }), className)}
			{...props}
		>
			{children}
		</div>
	)
}
