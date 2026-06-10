'use client'

import type { ReactNode } from 'react'
import { useIdScope } from '../../hooks/use-id-scope'
import { ControlContext } from './context'
import { useControlFieldContext } from './use-control-field-context'

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
 */
export function ControlField({ htmlFor, children }: ControlFieldProps) {
	const scope = useIdScope({ id: htmlFor })

	const value = useControlFieldContext(scope.id)

	return <ControlContext value={value}>{children}</ControlContext>
}
