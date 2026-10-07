import { narabi } from '../kiso'
import { control } from '../kiso/control'

const { toggle, group } = narabi

export const k = {
	// The field row also dims the label of a disabled control.
	field: [...toggle, ...control.check.disabled],
	// The field rows stop the iOS double-tap wait (`narabi/toggle.ts`). The group
	// also stops it, so that a tap in the gap between two rows does not wait.
	group: [...group, 'touch-manipulation'],
}
