import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function IconOnly() {
	// The object form of `toolbar` sets the look of a tool button. `iconOnly`
	// shows the icon alone, and the label stays the accessible name. `tooltip`
	// shows the label on hover and on keyboard focus.
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnManager={{ toolbar: { iconOnly: true, tooltip: true } }}
			exportable={{ types: ['csv', 'excel'], toolbar: { iconOnly: true, tooltip: true } }}
		/>
	)
}
