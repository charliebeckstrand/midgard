import { shaku } from '../kiso'

// Icon sizes from the shaku icon-dimension scale; the same scale's slot
// projection (`shaku.icon`) sizes `data-slot="icon"` descendants on Button,
// Badge, and Sidebar.
export const k = {
	size: shaku.iconSize,
} as const
