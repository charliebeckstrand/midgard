import { narabi } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'

const { toggle, group } = narabi

export const k = {
	// The field row also dims the label of a disabled control.
	field: [...toggle, ...control.check.disabled],
	// The field rows stop the iOS double-tap wait (`narabi/toggle.ts`). The group
	// also stops it, so that a tap in the gap between two rows does not wait. The
	// touch gap is the gap between two rows (`dan.space.fieldset.field`), so the
	// press areas of two rows meet at the middle of the gap.
	group: [...group, 'touch-manipulation', dan.gap.touch.y.sm],
}
