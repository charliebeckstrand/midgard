'use client'

import { useMemo } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { katachi } from '../../recipes'
import {
	type ControlContextValue,
	ControlProvider,
	type ControlSize,
	type ControlVariant,
	useControl,
} from './context'

const k = katachi.fieldset

export type ControlProps = {
	id?: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	size?: ControlSize
	variant?: ControlVariant
	className?: string
	children: React.ReactNode
}

/**
 * Context wrapper for form fields and interactive groups.
 *
 * Generates a stable id and propagates `disabled`, `invalid`, `readOnly`,
 * `required`, `size`, and `variant` state to control-aware children
 * (Label, Input, Textarea, Description, ErrorMessage, etc.).
 *
 * Supports nesting — a parent Control's `disabled` and `readOnly` cascade
 * to children (matching `<fieldset disabled>` semantics), while `size` and
 * `variant` inherit from the nearest ancestor unless explicitly overridden.
 *
 *     <Control required size="sm">
 *       <Label>Email</Label>
 *       <Input type="email" />
 *       <ErrorMessage>Required</ErrorMessage>
 *     </Control>
 */
export function Control({
	id: idProp,
	disabled,
	invalid,
	readOnly,
	required,
	size,
	variant,
	className,
	children,
}: ControlProps) {
	const parent = useControl()
	const scope = useIdScope({ id: idProp })

	// Nesting: disabled/readOnly OR-merge with parent (parent wins).
	// invalid/required are per-field — no inheritance.
	// size/variant inherit from nearest ancestor unless explicitly set.
	const mergedDisabled = disabled || parent?.disabled
	const mergedReadOnly = readOnly || parent?.readOnly
	const mergedSize = size ?? parent?.size
	const mergedVariant = variant ?? parent?.variant

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			disabled: mergedDisabled,
			invalid,
			readOnly: mergedReadOnly,
			required,
			size: mergedSize,
			variant: mergedVariant,
		}),
		[scope.id, mergedDisabled, invalid, mergedReadOnly, required, mergedSize, mergedVariant],
	)

	return (
		<ControlProvider value={value}>
			<div
				data-slot="field"
				{...(mergedDisabled ? { 'data-disabled': true } : {})}
				className={cn(k.field, className)}
			>
				{children}
			</div>
		</ControlProvider>
	)
}
