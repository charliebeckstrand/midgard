import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { type TextareaVariants, textareaVariants } from './variants'

export type TextareaProps = TextareaVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({ className, resize, ...props }: TextareaProps) {
	return (
		<FormControl>
			<textarea
				data-slot="textarea"
				className={cn(textareaVariants({ resize }), className)}
				{...props}
			/>
		</FormControl>
	)
}
