export type { SwitchProps } from './switch'
export { Switch, SwitchField, SwitchGroup } from './switch'
export { switchVariants } from './variants'

import { skeleton } from '../placeholder'

/** Skeleton matching Switch dimensions — pill toggle shape */
export const SwitchSkeleton = skeleton(
	'inline-flex h-6 w-10 rounded-full sm:h-5 sm:w-8',
	'SwitchSkeleton',
)
