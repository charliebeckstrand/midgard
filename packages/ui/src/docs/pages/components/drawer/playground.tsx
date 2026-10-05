import { useState } from 'react'
import { Button } from 'ui/button'
import {
	Drawer,
	DrawerBody,
	DrawerDescription,
	DrawerHeader,
	type DrawerProps,
	DrawerTitle,
	DrawerTrigger,
} from 'ui/drawer'
import { Text } from 'ui/text'

export default function DrawerPlayground(props: DrawerProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<DrawerTrigger open={open} onClick={() => setOpen(true)}>
				<Button variant="outline">Track order</Button>
			</DrawerTrigger>
			<Drawer open={open} onOpenChange={setOpen} {...props}>
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
			</Drawer>
		</>
	)
}
