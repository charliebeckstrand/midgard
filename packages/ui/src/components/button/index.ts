export { Button } from './button'
export type { ButtonProps } from './types'
export { button } from './variants'

import { katachi, ma } from '../../recipes'
import { skeleton } from '../placeholder'

/** Skeleton matching Button dimensions — inline, control padding, rounded. Override width via className. */
export const ButtonSkeleton = skeleton(
	`inline-flex w-24 sm:w-20 ${katachi.maru} border border-transparent ${ma.control}`,
	'ButtonSkeleton',
)
