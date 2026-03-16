import { Button } from '../../components/button'
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../../components/sheet'

export const meta = { category: 'Overlay' }

export default function SheetDemo() {
	return (
		<div className="flex gap-3">
			<Sheet>
				<SheetTrigger>
					<Button>Open Right</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Sheet Title</SheetTitle>
						<SheetDescription>This is a sheet panel sliding from the right.</SheetDescription>
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
			<Sheet side="left">
				<SheetTrigger>
					<Button variant="outline">Open Left</Button>
				</SheetTrigger>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Left Sheet</SheetTitle>
					</SheetHeader>
					<SheetBody>
						<p className="text-sm text-zinc-500">Slides from the left.</p>
					</SheetBody>
				</SheetContent>
			</Sheet>
		</div>
	)
}
