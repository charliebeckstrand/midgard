export type { SelectProps } from './select'
export { Select } from './select'

import { kage, katachi, ma } from '../../recipes'
import { skeleton } from '../placeholder'

/** Skeleton matching Select dimensions — same chrome as Input */
export const SelectSkeleton = skeleton(
	`block w-full ${katachi.maru} ${kage.ring} ${ma.control}`,
	'SelectSkeleton',
)
