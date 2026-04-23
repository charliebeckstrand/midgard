'use client'

import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Icon } from '../components/icon'
import { cn } from '../core'
import { option as k } from '../recipes/kata/option'

const defaultCheckIcon = (
	<Icon
		icon={<Check />}
		className="relative hidden self-center text-green-600 group-data-selected/option:inline"
	/>
)

export type BaseOptionProps = {
	className?: string
	icon?: ReactNode
	selected: boolean
	disabled?: boolean
	onSelect: () => void
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'onSelect'>

/** Shared option row for select-like components. */
export function BaseOption({
	children,
	className,
	icon,
	selected,
	disabled,
	onSelect,
	...props
}: BaseOptionProps) {
	const sharedClasses = cn(k.content)

	const checkIcon = icon ?? defaultCheckIcon

	return (
		<div
			role="option"
			aria-selected={selected}
			aria-disabled={disabled || undefined}
			data-selected={selected ? '' : undefined}
			data-disabled={disabled ? '' : undefined}
			tabIndex={-1}
			onClick={() => !disabled && onSelect()}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()

					if (!disabled) onSelect()
				}
			}}
			className={cn(k.base)}
			{...props}
		>
			<span className={cn(className, sharedClasses)}>{children}</span>
			{checkIcon}
		</div>
	)
}

/** Primary label for a select-like option. */
export function OptionLabel({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={cn(k.label, className)} />
}

/** Secondary description for a select-like option. */
export function OptionDescription({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'span'>) {
	return (
		<span {...props} className={cn(k.description, className)}>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}

export type SelectOptionProps = {
	value: unknown
	disabled?: boolean
	icon?: ReactNode
	className?: string
	children?: ReactNode
}

export type SelectLabelProps = ComponentPropsWithoutRef<'span'>

export type SelectDescriptionProps = ComponentPropsWithoutRef<'span'>

/** Factory for select-like option components. Only the data-slot prefix and context hook differ. */
export function createSelectOption(config: {
	slotPrefix: string
	useContext: () => {
		value: unknown
		multiple?: boolean
		select: (value: unknown) => void
	}
}) {
	function Option({ value, disabled, icon, className, children }: SelectOptionProps) {
		const { value: selectedValue, multiple, select } = config.useContext()

		const selected =
			multiple && Array.isArray(selectedValue)
				? selectedValue.includes(value)
				: selectedValue === value

		return (
			<BaseOption
				selected={selected}
				disabled={disabled}
				icon={icon}
				onSelect={() => select(value)}
				data-slot={`${config.slotPrefix}-option`}
				className={className}
			>
				{children}
			</BaseOption>
		)
	}

	function Label({ className, ...props }: SelectLabelProps) {
		return (
			<OptionLabel data-slot={`${config.slotPrefix}-label`} className={cn(className)} {...props} />
		)
	}

	function Description({ className, ...props }: SelectDescriptionProps) {
		return (
			<OptionDescription
				data-slot={`${config.slotPrefix}-description`}
				className={cn(className)}
				{...props}
			/>
		)
	}

	return { Option, Label, Description }
}
