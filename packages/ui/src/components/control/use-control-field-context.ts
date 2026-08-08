'use client'

import { useMemo } from 'react'
import { useA11yControl } from '../../hooks'
import { type ControlContextValue, type ControlSeverity, useControl } from './context'

/**
 * The three axes a field wrapper may layer over the inherited cascade. Every
 * other key passes through from the parent unchanged.
 *
 * @internal
 */
type ControlFieldOverrides = {
	autoComplete?: string
	/** ORed with the parent, so a field cannot re-enable a disabled ancestor. */
	disabled?: boolean
	severity?: ControlSeverity
}

/**
 * Builds the `ControlContext` value a field wrapper broadcasts: inherits the
 * parent control cascade and spreads the `useA11yControl` bundle (label /
 * description / error slots) off the field id.
 *
 * Two wrappers share it. {@link ControlField} — the envelope behind
 * `CheckboxField` / `RadioField` / `SwitchField` — passes no overrides and
 * inherits everything. `Field` passes its own `autoComplete`, `disabled`, and
 * `severity` props.
 *
 * @param id - The scoped field id the context broadcasts and the a11y slots key off.
 * @param overrides - The wrapper's own props, where it has them.
 * @returns A memoized {@link ControlContextValue} to pass into `ControlContext`.
 * @internal Not on the barrel — backs the field wrappers.
 */
export function useControlFieldContext(
	id: string,
	overrides: ControlFieldOverrides = {},
): ControlContextValue {
	const parent = useControl()

	const a11y = useA11yControl(id)

	const { autoComplete, disabled, severity } = overrides

	// Keyed on the destructured values, not the `overrides` object: call sites
	// pass a fresh literal each render, which would defeat the memo.
	return useMemo<ControlContextValue>(
		() => ({
			id,
			autoComplete: autoComplete ?? parent?.autoComplete,
			disabled: disabled || parent?.disabled,
			readOnly: parent?.readOnly,
			required: parent?.required,
			severity: severity ?? parent?.severity,
			size: parent?.size,
			variant: parent?.variant,
			...a11y,
		}),
		[id, autoComplete, disabled, severity, parent, a11y],
	)
}
