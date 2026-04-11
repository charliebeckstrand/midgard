import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { katachi, kokkaku } from '../../recipes'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type TextareaVariants, textareaVariants } from './variants'

const k = katachi.textarea

export type TextareaProps = TextareaVariants & {
	className?: string
	actions?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({ className, resize, autoResize, actions, ...props }: TextareaProps) {
	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.textarea.base, className)} />
	}

	if (actions !== undefined) {
		return (
			<FormControl className={cn(k.frame)}>
				<textarea
					data-slot="textarea"
					className={cn(textareaVariants({ resize: 'none', autoResize }), k.bare, className)}
					{...props}
				/>
				<div data-slot="textarea-actions" className={cn(k.actions)}>
					{actions}
				</div>
			</FormControl>
		)
	}

	return (
		<FormControl>
			<textarea
				data-slot="textarea"
				className={cn(textareaVariants({ resize, autoResize }), className)}
				{...props}
			/>
		</FormControl>
	)
}
