'use client'

import type { VariantProps } from 'class-variance-authority'
import type React from 'react'
import { useCallback } from 'react'
import { cn } from '../../core'
import { ki, narabi } from '../../recipes'
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
				className={cn(narabi.group, className)}
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
			className={cn(narabi.toggle, className)}
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
			className={cn(`group inline-flex ${ki.reset}`, className)}
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
