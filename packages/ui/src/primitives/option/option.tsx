'use client'

import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef, ComponentType, ReactNode } from 'react'
import { cn } from '../../core'
import { option as k } from '../../recipes/waku/option'
import { useDensity } from '../density'

const defaultCheckIcon = (
	<Check
		aria-hidden="true"
		data-slot="icon"
		className="size-5 relative hidden self-center text-green-600 group-data-selected/option:inline"
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
	const { size } = useDensity()

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
			className={cn(k.base, k.size[size])}
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

export type OptionProps = {
	value: unknown
	disabled?: boolean
	icon?: ReactNode
	className?: string
	children?: ReactNode
}

export type OptionLabelProps = ComponentPropsWithoutRef<'span'>

export type OptionDescriptionProps = ComponentPropsWithoutRef<'span'>

/**
 * Factory for select-like option components. Consumers supply the data-slot
 * prefix, the context hook, and optionally a `CheckIcon` component for the
 * selected-state indicator.
 *
 * `CheckIcon` is the architectural escape hatch: primitives can't import
 * `<Icon>` (or anything else from `components/`), but a select-like option
 * needs a size-aware check icon. Consumers in `components/` instantiate the
 * factory with a `CheckIcon` that internally uses `<Icon>` to read its size
 * cascade. When omitted, the primitive falls back to a static lucide `<Check>`
 * so direct callers still render something sensible.
 */
export function createSelectOption(config: {
	slotPrefix: string
	useContext: () => {
		value: unknown
		multiple?: boolean
		select: (value: unknown) => void
	}
	CheckIcon?: ComponentType
}) {
	function Option({ value, disabled, icon, className, children }: OptionProps) {
		const { value: selectedValue, multiple, select } = config.useContext()

		const selected =
			multiple && Array.isArray(selectedValue)
				? selectedValue.includes(value)
				: selectedValue === value

		const resolvedIcon = icon ?? (config.CheckIcon ? <config.CheckIcon /> : undefined)

		return (
			<BaseOption
				selected={selected}
				disabled={disabled}
				icon={resolvedIcon}
				onSelect={() => select(value)}
				data-slot={`${config.slotPrefix}-option`}
				className={className}
			>
				{children}
			</BaseOption>
		)
	}

	function Label({ className, ...props }: OptionLabelProps) {
		return <OptionLabel data-slot={`${config.slotPrefix}-label`} className={className} {...props} />
	}

	function Description({ className, ...props }: OptionDescriptionProps) {
		return (
			<OptionDescription
				data-slot={`${config.slotPrefix}-description`}
				className={className}
				{...props}
			/>
		)
	}

	return { Option, Label, Description }
}
