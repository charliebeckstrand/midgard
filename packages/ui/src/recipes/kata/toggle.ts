import { narabi } from '../kiso'

const { toggle, group } = narabi

export const k = {
	field: toggle,
	// The field rows stop the iOS double-tap wait (`narabi/toggle.ts`). The group
	// also stops it, so a tap in the gap between two rows does not wait.
	group: [...group, 'touch-manipulation'],
}
