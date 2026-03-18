export type { CheckboxProps } from './checkbox'
export { Checkbox, CheckboxField, CheckboxGroup } from './checkbox'
export { checkbox } from './variants'

import { skeleton } from '../placeholder'

/** Skeleton matching Checkbox dimensions — small rounded square */
export const CheckboxSkeleton = skeleton(
	'inline-flex size-4.5 rounded-[0.3125rem] sm:size-4',
	'CheckboxSkeleton',
)
