'use client'

import type { ReactNode } from 'react'
import { useIdScope } from '../../hooks/use-id-scope'
import { ControlContext } from './context'
import { useControlFieldContext } from './use-control-field-context'

export type ControlFieldProps = {
	/** Pin the generated field id; otherwise a scoped id is derived. */
	htmlFor?: string
	children: ReactNode
}

/**
 * Field-scoping envelope shared by the single-control field wrappers
 * (`CheckboxField` / `RadioField` / `SwitchField`). Generates a scoped id and
 * broadcasts it through `ControlContext` so the wrapped control and its Label
 * auto-wire without the consumer touching `id` / `htmlFor`. Each field renders
 * its own slot element as the child; this owns only the id + context wiring so
 * a new field can't silently drop the `aria-describedby` plumbing.
 */
export function ControlField({ htmlFor, children }: ControlFieldProps) {
	const scope = useIdScope({ id: htmlFor })

	const value = useControlFieldContext(scope.id)

	return <ControlContext value={value}>{children}</ControlContext>
}
