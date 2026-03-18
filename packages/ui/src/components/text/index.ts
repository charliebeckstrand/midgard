export type { CodeProps, StrongProps, TextLinkProps, TextProps } from './text'
export { Code, Strong, Text, TextLink } from './text'

import { skeleton } from '../placeholder'

/** Skeleton matching a single line of body text */
export const TextSkeleton = skeleton('h-4 w-full max-w-[85%] rounded-full', 'TextSkeleton')
