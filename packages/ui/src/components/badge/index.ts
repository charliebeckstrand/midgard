export type { BadgeProps } from './badge'
export { Badge, BadgeButton } from './badge'
export { badge } from './variants'

import { skeleton } from '../placeholder'

/** Skeleton matching Badge md dimensions — inline pill */
export const BadgeSkeleton = skeleton(
	'inline-flex rounded-md px-1.5 py-0.5 text-sm/5 sm:text-xs/5',
	'BadgeSkeleton',
)
