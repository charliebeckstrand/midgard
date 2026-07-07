'use client'

import { type DensityLevel, densityLevels } from '../../../providers/density'
import { OptionsListbox } from './options-listbox'

type DensityListboxProps = {
	value: DensityLevel
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: DensityLevel) => void
}

/** A demo control for switching the active {@link DensityLevel}, labelled from the density scale. */
export function DensityListbox(props: DensityListboxProps) {
	return <OptionsListbox options={densityLevels} {...props} />
}
