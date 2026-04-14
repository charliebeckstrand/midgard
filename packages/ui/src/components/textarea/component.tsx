'use client'

import { cn } from '../../core'
import { FormControl } from '../../primitives'
import { katachi, kokkaku } from '../../recipes'
import { useControl } from '../control/context'
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
	id,
	disabled,
	required,
	readOnly,
	...props
}: TextareaProps) {
	const glass = useGlass()
	const control = useControl()

	const resolvedId = id ?? control?.id
	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedReadOnly = readOnly ?? control?.readOnly

	const resolvedVariant = variant ?? (glass ? 'glass' : undefined)

	const transparentControl =
		(resolvedVariant === 'outline' || resolvedVariant === 'glass') &&
		'bg-transparent dark:bg-transparent before:shadow-none'

	if (useSkeleton()) {
		return <Placeholder className={cn(kokkaku.textarea.base, className)} />
	}

	const controlProps = {
		id: resolvedId,
		disabled: resolvedDisabled,
		required: resolvedRequired,
		readOnly: resolvedReadOnly,
		...(control?.invalid ? { 'data-invalid': '', 'aria-invalid': true as const } : {}),
	}

	if (actions !== undefined) {
		return (
			<FormControl className={cn(k.frame, transparentControl)}>
				<textarea
					data-slot="textarea"
					{...controlProps}
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
				{...controlProps}
				className={cn(
					textareaVariants({ variant: resolvedVariant, resize, autoResize }),
					className,
				)}
				{...props}
			/>
		</FormControl>
	)
}
