'use client'

import { useGlass } from '../../providers/glass/context'
import { type ControlVariant, useControl } from './context'

/**
 * The surface of a control: the variant of the enclosing Control. Without one,
 * a control in a glass overlay paints no fill, so it takes `outline`, and any
 * other takes `default`. The triggers of Listbox, Combobox, DatePicker, and
 * ColorPicker read it.
 *
 * @internal
 */
export function useControlSurface(): ControlVariant {
	const control = useControl()

	const glass = useGlass()

	return control?.variant ?? (glass ? 'outline' : 'default')
}
