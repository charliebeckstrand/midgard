'use client'

import { useGlass } from '../../providers/glass/context'
import { type ControlVariant, useControl } from './context'

/**
 * The surface of a trigger control, such as a Listbox or a DatePicker button:
 * the variant of the enclosing Control. Without one, a trigger in a glass
 * overlay paints no fill, so it takes `outline`, and any other takes `default`.
 *
 * @internal
 */
export function useControlTriggerSurface(): ControlVariant {
	const control = useControl()

	const glass = useGlass()

	return control?.variant ?? (glass ? 'outline' : 'default')
}
