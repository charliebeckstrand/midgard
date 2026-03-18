export type { AvatarProps } from './avatar'
export { Avatar, AvatarButton } from './avatar'

import { skeleton } from '../placeholder'

/** Skeleton matching Avatar dimensions — circular, size via className */
export const AvatarSkeleton = skeleton('inline-grid size-8 rounded-full', 'AvatarSkeleton')
