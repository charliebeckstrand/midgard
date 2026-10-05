import { DrawerBody, DrawerDescription, DrawerHeader, DrawerStatic, DrawerTitle } from 'ui/drawer'
import { Text } from 'ui/text'

export default function StaticDrawer() {
	return (
		// The paint containment keeps the fixed layers of the static drawer in this box.
		<div className="relative h-96 overflow-hidden rounded-lg border border-zinc-200 [contain:paint] dark:border-zinc-800">
			<Text className="p-4">
				The page under the drawer. A deep link or a reload opens the drawer before the client can
				mount it, so the static drawer paints it on the first frame.
			</Text>
			<DrawerStatic>
				<DrawerHeader>
					<DrawerTitle>Order #1042</DrawerTitle>
					<DrawerDescription>Arrives Thursday, June 18.</DrawerDescription>
				</DrawerHeader>
				<DrawerBody>
					<Text>A picture of the open drawer. Nothing in it takes focus or a click.</Text>
				</DrawerBody>
			</DrawerStatic>
		</div>
	)
}
