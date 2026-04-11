import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type TextareaVariants, textareaVariants } from './variants'

export type TextareaProps = TextareaVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({ className, resize, ...props }: TextareaProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.textarea.base, className)} />
	}

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
