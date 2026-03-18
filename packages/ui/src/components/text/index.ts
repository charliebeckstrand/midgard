export type { CodeProps, StrongProps, TextLinkProps, TextProps } from './text'
export { Code, Strong, Text, TextLink } from './text'

import { skeleton } from '../placeholder'

/** Skeleton matching a single line of body text (text-base/6 = 24px line-height) */
export const TextSkeleton = skeleton('h-5 w-full max-w-[85%] rounded-full', 'TextSkeleton')
