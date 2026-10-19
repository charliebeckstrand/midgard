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
	//
	// On a coarse pointer, the gap between two rows is wider, so that the pitch of
	// two rows is near 44 px at `md`, the floor of `TouchTarget`. A row with only a
	// label is short, and a finger press often lands that far from its target.
	// Thus a press went to the next row. The gap steps with density, and a single
	// toggle has no gap, so it keeps its height.
	group: [
		...group,
		'touch-manipulation',
		dan.gap.touch.y.sm,
		dan.space.fieldset.toggle,
		dan.gap.touch.toggle,
	],
}
