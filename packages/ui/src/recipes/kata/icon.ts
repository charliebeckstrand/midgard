import { shaku } from '../kiso'

// The scale's slot projection (`shaku.icon`) sizes `data-slot="icon"`
// descendants on Button, Badge, Nav, and Sidebar, so standalone icons match
// embedded ones. `ramp` is the same scale with each step under a `density-*`
// variant, so an icon with no `size` takes the step of its nearest density
// scope.
export const k = {
	size: shaku.iconSize,
	ramp: 'density-xs:size-3 density-sm:size-4 density-md:size-5 density-lg:size-6',
} as const
