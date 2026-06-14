import { shaku } from '../kiso'

// The scale's slot projection (`shaku.icon`) sizes `data-slot="icon"`
// descendants on Button, Badge, Nav, and Sidebar, so standalone icons match
// embedded ones.
export const k = {
	size: shaku.iconSize,
} as const
