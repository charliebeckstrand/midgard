import { Divider } from '../../../components/divider'
import { Axes } from '../../engine'

export function Demo() {
	return (
		<Axes
			of="Divider"
			render={(props) => (
				// The frame gives a vertical divider a height. It fills the instance box, so
				// a horizontal divider takes the width of the box.
				<div className="flex h-12 items-center">
					<Divider {...props} />
				</div>
			)}
		/>
	)
}
