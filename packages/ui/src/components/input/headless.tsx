'use client'

import type { ComponentPropsWithoutRef, Ref } from 'react'
import { useIdScope } from '../../hooks/use-id-scope'
import { useControl } from '../control/context'

export type HeadlessInputProps = {
	ref?: Ref<HTMLInputElement>
	/** Forces the invalid state. When omitted, inherits from Control context. */
	invalid?: boolean
} & Omit<ComponentPropsWithoutRef<'input'>, 'size'>

/**
 * Unstyled `<input>` wired to Control context. Handles id scoping, disabled /
 * required / readOnly / autoComplete inheritance, and invalid-state attributes.
 * Consumers bring their own chrome.
 */
export function HeadlessInput({
	ref,
	id,
	disabled,
	required,
	readOnly,
	autoComplete,
	invalid,
	...props
}: HeadlessInputProps) {
	const control = useControl()

	const scope = useIdScope({ id: id ?? control?.id })

	const resolvedDisabled = disabled ?? control?.disabled
	const resolvedRequired = required ?? control?.required
	const resolvedReadOnly = readOnly ?? control?.readOnly
	const resolvedAutoComplete = autoComplete ?? control?.autoComplete
	const resolvedInvalid = invalid ?? control?.invalid

	return (
		<input
			ref={ref}
			data-slot="input"
			id={scope.id}
			disabled={resolvedDisabled}
			required={resolvedRequired}
			readOnly={resolvedReadOnly}
			autoComplete={resolvedAutoComplete}
			{...(resolvedInvalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
			{...props}
		/>
	)
}
