import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { maru } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type TextareaVariants, textareaVariants } from './variants'

export type TextareaProps = TextareaVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({ className, resize, ...props }: TextareaProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn('h-28 w-full', maru.rounded, className)} />
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
