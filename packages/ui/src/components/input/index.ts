export type { InputProps } from './input'
export { Input, InputGroup } from './input'
export type { PasswordInputProps } from './password'
export { PasswordInput } from './password'

import { kage, katachi, ma } from '../../recipes'
import { skeleton } from '../placeholder'

/** Skeleton matching Input dimensions — full width, control padding, ring border */
export const InputSkeleton = skeleton(
	`block w-full ${katachi.maru} ${kage.ring} ${ma.control}`,
	'InputSkeleton',
)
