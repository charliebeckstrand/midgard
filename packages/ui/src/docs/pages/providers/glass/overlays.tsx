import { useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from 'ui/dialog'
import { Drawer, DrawerBody, DrawerFooter, DrawerTitle } from 'ui/drawer'
import { GlassProvider } from 'ui/providers/glass'
import { Sheet, SheetBody, SheetFooter, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'

function GlassDialog() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Dialog
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTitle>Glass dialog</DialogTitle>
				<DialogBody>
					<Text>This dialog inherits glass mode from the GlassProvider wrapper.</Text>
				</DialogBody>
				<DialogFooter>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Close
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}

function GlassDrawer() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Drawer
			</Button>
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTitle>Glass drawer</DrawerTitle>
				<DrawerBody>
					<Text>Inherits glass mode from context.</Text>
				</DrawerBody>
				<DrawerFooter>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</DrawerFooter>
			</Drawer>
		</>
	)
}

function GlassSheet() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Sheet
			</Button>
			<Sheet side="left" open={open} onOpenChange={setOpen}>
				<SheetTitle>Glass sheet</SheetTitle>
				<SheetBody>
					<Text>Inherits glass mode from context.</Text>
				</SheetBody>
				<SheetFooter>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</SheetFooter>
			</Sheet>
		</>
	)
}

export default function Overlays() {
	return (
		<GlassProvider>
			<GlassDialog />
			<GlassDrawer />
			<GlassSheet />
		</GlassProvider>
	)
}
