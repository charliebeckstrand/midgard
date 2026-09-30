import { Button } from '../../../components/button'
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetFooter,
	SheetTitle,
	SheetTrigger,
} from '../../../components/sheet'
import { Text } from '../../../components/text'
import { Axes, Opener } from '../../engine'

export function Demo() {
	return (
		// With `handle`, the grip rides the inner edge. Drag it to set the width, or
		// focus it and use the arrow keys. A flick toward the edge puts the panel
		// away, and the panel opens again at the width of its variant.
		<Axes
			of="Sheet"
			omit={['open', 'defaultOpen']}
			render={(props, label) => (
				<Opener>
					<SheetTrigger>
						<Button variant="outline">{label}</Button>
					</SheetTrigger>

					<Sheet {...props}>
						<SheetTitle>{label}</SheetTitle>

						<SheetBody>
							<Text>Press the backdrop, press Escape, or use the button to close the sheet.</Text>
						</SheetBody>

						<SheetFooter>
							<SheetClose>
								<Button>Close</Button>
							</SheetClose>
						</SheetFooter>
					</Sheet>
				</Opener>
			)}
		/>
	)
}
