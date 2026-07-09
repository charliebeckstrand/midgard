import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { employees, lockedBothColumns, lockedLeftColumns, lockedMixedColumns } from './_employees'

const LockedLeftExample = () => (
	// Name is locked to the left — frozen with no unpin affordance anywhere. Its
	// header shows an edge arrow (not a pin button), and the column manager shows
	// the same arrow instead of a pin control; the other columns scroll past it.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={lockedLeftColumns}
		rows={employees}
		getKey={(row) => row.id}
		columnManager={{ toolbarButton: true }}
	/>
)

const LockedWithPinnedExample = () => (
	// Name is locked to the left (immutable) while Status is user-pinned to the
	// right (the user can unpin it). Open the column manager to see the locked
	// Name's edge arrow beside the other columns' interactive pin controls.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={lockedMixedColumns}
		rows={employees}
		getKey={(row) => row.id}
		columnManager={{ toolbarButton: true }}
	/>
)

const LockedBothEdgesExample = () => (
	// Name is locked to the left and Status to the right — both frozen and
	// immutable, so the row stays anchored on both edges while the middle scrolls.
	<Grid
		resizable
		header={{ position: 'sticky' }}
		maxHeight="320px"
		columns={lockedBothColumns}
		rows={employees}
		getKey={(row) => row.id}
		columnManager={{ toolbarButton: true }}
	/>
)

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Locked left" code={code`<Grid columns={[{ ...col, locked: 'left' }]} />`}>
				<LockedLeftExample />
			</Example>

			<Example
				title="Locked with pinnable columns"
				code={code`<Grid columns={[{ ...col, locked: 'left' }, { ...col, pinned: 'right' }]} />`}
			>
				<LockedWithPinnedExample />
			</Example>

			<Example
				title="Locked on both edges"
				code={code`<Grid columns={[{ ...col, locked: 'left' }, { ...col, locked: 'right' }]} />`}
			>
				<LockedBothEdgesExample />
			</Example>
		</Stack>
	)
}
