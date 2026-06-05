import { shaku } from '../kiso'

// Icon sizes itself from the shaku icon-dimension scale — the same scale whose
// slot projection (`shaku.icon`) sizes `data-slot="icon"` descendants on Button,
// Badge, and Sidebar.
export const k = {
	size: shaku.iconSize,
} as const
