import { Divider } from '../../../components/divider'
import { Axes } from '../../engine'

export function Demo() {
	return (
		<Axes
			of="Divider"
			render={(props) => (
				// The frame gives a vertical divider a height, and a horizontal divider a width.
				<div className="flex h-12 w-full items-center">
					<Divider {...props} />
				</div>
			)}
		/>
	)
}
