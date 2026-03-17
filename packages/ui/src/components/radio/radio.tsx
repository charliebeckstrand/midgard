'use client'

import type { VariantProps } from 'class-variance-authority'
import type React from 'react'
import { useCallback } from 'react'
import { cn } from '../../core'
import { RadioGroupProvider, useRadioGroup } from './context'
import { radio } from './variants'

export function RadioGroup({
	className,
	value,
	onChange,
	disabled,
	children,
	...props
}: {
	className?: string
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	disabled?: boolean
	children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onChange'>) {
	return (
		<RadioGroupProvider value={{ value, onChange: onChange ?? (() => {}), disabled }}>
			<div
				role="radiogroup"
				data-slot="control"
				data-disabled={disabled ? '' : undefined}
				{...props}
				className={cn(
					'space-y-3 **:data-[slot=label]:font-normal',
					'has-data-[slot=description]:space-y-6 has-data-[slot=description]:**:data-[slot=label]:font-medium',
					className,
				)}
			>
				{children}
			</div>
		</RadioGroupProvider>
	)
}

export function RadioField({
	className,
	disabled,
	...props
}: { className?: string; disabled?: boolean } & React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			data-slot="field"
			data-disabled={disabled ? '' : undefined}
			{...props}
			className={cn(
				'grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[1rem_1fr]',
				'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75 sm:*:data-[slot=control]:mt-1',
				'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
				'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
				'has-data-[slot=description]:**:data-[slot=label]:font-medium',
				className,
			)}
		/>
	)
}

export type RadioProps = VariantProps<typeof radio> & {
	className?: string
	value: string
	disabled?: boolean
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'value'>

export function Radio({ color, className, value, disabled: localDisabled, ...props }: RadioProps) {
	const { value: groupValue, onChange, disabled: groupDisabled } = useRadioGroup()
	const disabled = localDisabled ?? groupDisabled
	const checked = groupValue === value

	const handleClick = useCallback(() => {
		if (disabled) return
		onChange(value)
	}, [disabled, onChange, value])

	return (
		// biome-ignore lint/a11y/useSemanticElements: button with role="radio" is intentional for custom styled radio
		<button
			type="button"
			role="radio"
			aria-checked={checked}
			data-slot="control"
			data-checked={checked ? '' : undefined}
			disabled={disabled}
			onClick={handleClick}
			className={cn('group inline-flex focus:outline-hidden', className)}
			{...props}
		>
			<span className={radio({ color })}>
				<span
					className={cn(
						'size-full rounded-full border-[4.5px] border-transparent bg-(--radio-indicator) bg-clip-padding',
						'forced-colors:border-[Canvas] forced-colors:group-data-checked:border-[Highlight]',
					)}
				/>
			</span>
		</button>
	)
}
