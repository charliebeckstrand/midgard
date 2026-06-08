'use client'

import { type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yControl } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { Density } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import {
	ControlContext,
	type ControlContextValue,
	type ControlSize,
	type ControlVariant,
	useControl,
} from './context'

export type ControlProps = {
	id?: string
	autoComplete?: string
	disabled?: boolean
	invalid?: boolean
	readOnly?: boolean
	required?: boolean
	size?: ControlSize
	variant?: ControlVariant
	className?: string
	children: ReactNode
}

/**
 * Generates a stable id and broadcasts `disabled`, `invalid`, `readOnly`,
 * `required`, `size`, and `variant` to control-aware descendants. Nests:
 * `disabled` / `readOnly` cascade through inner Controls, `size` / `variant`
 * inherit unless overridden.
 */
export function Control({
	id: idProp,
	autoComplete,
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

	// disabled/readOnly OR-merge with parent; size/variant inherit unless overridden.
	const mergedDisabled = disabled || parent?.disabled
	const mergedReadOnly = readOnly || parent?.readOnly

	const mergedSize = size ?? parent?.size

	const mergedVariant = variant ?? parent?.variant

	const mergedAutoComplete = autoComplete ?? parent?.autoComplete

	const a11y = useA11yControl(scope.id)

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			autoComplete: mergedAutoComplete,
			disabled: mergedDisabled,
			invalid,
			readOnly: mergedReadOnly,
			required,
			size: mergedSize,
			variant: mergedVariant,
			describedBy: a11y.describedBy,
			descriptionId: a11y.descriptionId,
			messageId: a11y.messageId,
			registerDescription: a11y.registerDescription,
			registerMessage: a11y.registerMessage,
		}),
		[
			scope.id,
			mergedAutoComplete,
			mergedDisabled,
			invalid,
			mergedReadOnly,
			required,
			mergedSize,
			mergedVariant,
			a11y.describedBy,
			a11y.descriptionId,
			a11y.messageId,
			a11y.registerDescription,
			a11y.registerMessage,
		],
	)

	const body = (
		<div
			data-slot="control"
			{...(mergedDisabled ? { 'data-disabled': true } : {})}
			className={cn(k.field, className)}
		>
			{children}
		</div>
	)

	return (
		<ControlContext value={value}>
			{mergedSize ? <Density scale={mergedSize}>{body}</Density> : body}
		</ControlContext>
	)
}
