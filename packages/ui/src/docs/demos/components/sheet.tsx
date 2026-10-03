import { Button } from '../../../components/button'
import { Sheet, SheetBody, SheetTitle, SheetTrigger } from '../../../components/sheet'
import { Text } from '../../../components/text'
import { Axes, Opener } from '../../engine'

export function Demo() {
	return (
		// With `handle`, the grip rides the inner edge. Drag it to set the width, or
		// focus it and use the arrow keys. The panel opens again at the width of its
		// variant.
		<Axes
			of="Sheet"
			captions={false}
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

						{/* With no footer of its own, the sheet shows the standard Close button. */}
					</Sheet>
				</Opener>
			)}
		/>
	)
}
