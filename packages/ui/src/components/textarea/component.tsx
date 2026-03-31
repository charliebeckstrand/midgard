import { cn } from '../../core'
import { type TextareaVariants, textareaControlVariants, textareaVariants } from './variants'

export type TextareaProps = TextareaVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({ className, resize, ...props }: TextareaProps) {
	return (
		<span data-slot="control" className={textareaControlVariants()}>
			<textarea
				data-slot="textarea"
				className={cn(textareaVariants({ resize }), className)}
				{...props}
			/>
		</span>
	)
}
