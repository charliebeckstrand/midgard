import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { katachi, kokkaku } from '../../recipes'
import { useGlass } from '../glass/context'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { type TextareaVariants, textareaVariants } from './variants'

const k = katachi.textarea

export type TextareaProps = TextareaVariants & {
	className?: string
	actions?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'className'>

export function Textarea({
	className,
	variant,
	resize,
	autoResize,
	actions,
	...props
}: TextareaProps) {
	const glass = useGlass()

	const resolvedVariant = variant ?? (glass ? 'glass' : undefined)

	const transparentControl =
		(resolvedVariant === 'outline' || resolvedVariant === 'glass') &&
		'bg-transparent dark:bg-transparent before:shadow-none'

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.textarea.base, className)} />
	}

	if (actions !== undefined) {
		return (
			<FormControl className={cn(k.frame, transparentControl)}>
				<textarea
					data-slot="textarea"
					className={cn(
						textareaVariants({ variant: resolvedVariant, resize: 'none', autoResize }),
						k.bare,
						className,
					)}
					{...props}
				/>
				<div data-slot="textarea-actions" className={cn(k.actions)}>
					{actions}
				</div>
			</FormControl>
		)
	}

	return (
		<FormControl className={cn(transparentControl)}>
			<textarea
				data-slot="textarea"
				className={cn(
					textareaVariants({ variant: resolvedVariant, resize, autoResize }),
					className,
				)}
				{...props}
			/>
		</FormControl>
	)
}
