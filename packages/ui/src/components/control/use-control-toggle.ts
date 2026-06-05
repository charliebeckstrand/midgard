'use client'

import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import {
	type ControlPropsOptions,
	type ControlPropsResult,
	useControlProps,
} from './use-control-props'

type ControlToggleOptions = ControlPropsOptions & {
	size?: Step
}

type ControlToggleResult = ControlPropsResult & {
	size: Step
}

/**
 * Adds the Density-aware `size` resolution on top of {@link useControlProps}.
 *
 * `Checkbox`, `Radio`, and `Switch` each wrap their input in a label whose
 * recipe takes both. Resolution order: explicit prop > Density cascade.
 */
export function useControlToggle({
	size,
	...input
}: ControlToggleOptions = {}): ControlToggleResult {
	const props = useControlProps(input)

	const { size: inheritedSize } = useDensity()

	return { ...props, size: size ?? inheritedSize }
}
