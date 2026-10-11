import { Button } from 'ui/button'
import {
	Drawer,
	DrawerBody,
	DrawerDescription,
	DrawerHeader,
	DrawerPanel,
	DrawerTitle,
	DrawerTrigger,
} from 'ui/drawer'
import { Text } from 'ui/text'

export default function Resize() {
	return (
		<Drawer>
			<DrawerTrigger>
				<Button variant="outline">Read notes</Button>
			</DrawerTrigger>
			{/* A `handle` needs a fixed height, `half` or `full`. Drag the grip, or focus it and use the arrow keys. */}
			<DrawerPanel height="half" handle>
				<DrawerHeader>
					<DrawerTitle>Meeting notes</DrawerTitle>
					<DrawerDescription>Tuesday, June 16</DrawerDescription>
				</DrawerHeader>
				<DrawerBody>
					<Text>
						The team agreed to ship the new search page next week. Design reviews the empty states
						on Thursday, and support writes the help article before the release.
					</Text>
				</DrawerBody>
			</DrawerPanel>
		</Drawer>
	)
}
