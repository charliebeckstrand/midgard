import { Button } from '../../components/button'
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetOpen,
	SheetSubtitle,
	SheetTitle,
} from '../../components/sheet'

export const meta = { category: 'Overlay' }

export default function SheetDemo() {
	return (
		<div className="flex gap-3">
			<Sheet side="left">
				<SheetOpen>
					<Button variant="outline">Open Left</Button>
				</SheetOpen>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Left Sheet</SheetTitle>
					</SheetHeader>
					<SheetBody>
						<p className="text-sm text-zinc-500">Slides from the left.</p>
					</SheetBody>
				</SheetContent>
			</Sheet>
			<Sheet>
				<SheetOpen>
					<Button>Open Right</Button>
				</SheetOpen>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Sheet Title</SheetTitle>
						<SheetSubtitle>This is a sheet panel sliding from the right.</SheetSubtitle>
					</SheetHeader>
					<SheetBody>
						<p className="text-sm text-zinc-500">Sheet content goes here.</p>
					</SheetBody>
					<SheetFooter>
						<SheetClose>
							<Button variant="plain">Close</Button>
						</SheetClose>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</div>
	)
}
