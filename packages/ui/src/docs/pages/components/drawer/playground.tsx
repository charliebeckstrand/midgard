import { Button } from 'ui/button'
import {
	Drawer,
	DrawerBody,
	DrawerDescription,
	DrawerHeader,
	DrawerPanel,
	type DrawerPanelProps,
	DrawerTitle,
	DrawerTrigger,
} from 'ui/drawer'
import { Text } from 'ui/text'

export default function DrawerPlayground(props: DrawerPanelProps) {
	return (
		<Drawer>
			<DrawerTrigger>
				<Button variant="outline">Track order</Button>
			</DrawerTrigger>
			<DrawerPanel {...props}>
				<DrawerHeader>
					<DrawerTitle>Order #1042</DrawerTitle>
					<DrawerDescription>Arrives Thursday, June 18.</DrawerDescription>
				</DrawerHeader>
				<DrawerBody>
					<Text>
						Your order left the warehouse in Portland on Monday. The carrier scans it at each stop,
						and this page shows each new scan.
					</Text>
				</DrawerBody>
				{/* With no footer of its own, the drawer shows the standard Close button. */}
			</DrawerPanel>
		</Drawer>
	)
}
