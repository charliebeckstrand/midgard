import { Divider } from '../../../components/divider'
import { Axes } from '../../engine'

export function Demo() {
	return (
		<Axes
			of="Divider"
			render={(props) => (
				// The frame gives a vertical divider a height, and a horizontal divider a width.
				// A caption column takes no width of its own, so the frame sets a fixed width.
				<div className="flex h-12 w-48 items-center">
					<Divider {...props} />
				</div>
			)}
		/>
	)
}
