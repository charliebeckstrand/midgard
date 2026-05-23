'use client'

import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'
import {
	type UseControlPropsOptions,
	type UseControlPropsResult,
	useControlProps,
} from './use-control-props'

type UseControlToggleOptions = UseControlPropsOptions & {
	size?: Step
}

type UseControlToggleResult = UseControlPropsResult & {
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
}: UseControlToggleOptions = {}): UseControlToggleResult {
	const props = useControlProps(input)

	const { size: inheritedSize } = useDensity()

	return { ...props, size: size ?? inheritedSize }
}
