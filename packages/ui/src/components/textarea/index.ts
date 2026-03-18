export type { TextareaProps } from './textarea'
export { Textarea } from './textarea'

import { kage, katachi, ma } from '../../recipes'
import { skeleton } from '../placeholder'

/** Skeleton matching Textarea dimensions — full width, multi-row height, ring border */
export const TextareaSkeleton = skeleton(
	`block w-full ${katachi.maru} ${kage.ring} ${ma.control} min-h-[5.5rem] sm:min-h-[4.5rem]`,
	'TextareaSkeleton',
)
