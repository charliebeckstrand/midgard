'use client'

import { type ReactNode, useMemo } from 'react'
import { useA11yControl } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { ControlContext, type ControlContextValue, useControl } from './context'

/** Props for {@link ControlField}: the optional `htmlFor` id pin plus the wrapped control. @internal */
export type ControlFieldProps = {
	/** Pins the generated field id; otherwise derives a scoped id. */
	htmlFor?: string
	children: ReactNode
}

/**
 * Field-scoping envelope shared by the single-control field wrappers
 * (`CheckboxField` / `RadioField` / `SwitchField`). Generates a scoped id and
 * broadcasts it through `ControlContext`; the wrapped control and its Label
 * auto-wire without the consumer setting `id` / `htmlFor`. This owns only the
 * id + context wiring; each field renders its own slot element as the child.
 *
 * The broadcast value inherits the parent control cascade and spreads the
 * `useA11yControl` bundle (label / description / error slots) off the field id.
 *
 * @internal Not on the barrel — used by the field wrappers, not consumers.
 */
export function ControlField({ htmlFor, children }: ControlFieldProps) {
	const scope = useIdScope({ id: htmlFor })

	const parent = useControl()

	const a11y = useA11yControl(scope.id)

	const value = useMemo<ControlContextValue>(
		() => ({
			id: scope.id,
			autoComplete: parent?.autoComplete,
			disabled: parent?.disabled,
			readOnly: parent?.readOnly,
			required: parent?.required,
			severity: parent?.severity,
			size: parent?.size,
			variant: parent?.variant,
			...a11y,
		}),
		[scope.id, parent, a11y],
	)

	return <ControlContext value={value}>{children}</ControlContext>
}
