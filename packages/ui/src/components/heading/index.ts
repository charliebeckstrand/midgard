export type { HeadingProps } from './heading'
export { Heading, Subheading } from './heading'

import { skeleton } from '../placeholder'

/** Skeleton matching heading text height */
export const HeadingSkeleton = skeleton(
	'h-6 w-full max-w-[60%] rounded-full sm:h-5',
	'HeadingSkeleton',
)
