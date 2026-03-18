export type { HeadingProps } from './heading'
export { Heading, Subheading } from './heading'

import { skeleton } from '../placeholder'

/** Skeleton matching heading text height — defaults to level-2 size */
export const HeadingSkeleton = skeleton(
	'h-8 w-full max-w-[60%] rounded-full sm:h-7',
	'HeadingSkeleton',
)
