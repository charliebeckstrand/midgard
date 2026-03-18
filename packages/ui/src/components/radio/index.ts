export type { RadioProps } from './radio'
export { Radio, RadioField, RadioGroup } from './radio'
export { radio } from './variants'

import { skeleton } from '../placeholder'

/** Skeleton matching Radio dimensions — small circle */
export const RadioSkeleton = skeleton(
	'inline-flex size-4.75 rounded-full sm:size-4.25',
	'RadioSkeleton',
)
