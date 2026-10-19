import { useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogFooter, DialogPanel, DialogTitle } from 'ui/dialog'
import { Drawer, DrawerBody, DrawerFooter, DrawerPanel, DrawerTitle } from 'ui/drawer'
import { GlassProvider } from 'ui/providers/glass'
import { Sheet, SheetBody, SheetFooter, SheetPanel, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'

function GlassDialog() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Share
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogPanel>
					<DialogTitle>Share the project</DialogTitle>
					<DialogBody>
						<Text tone="muted">Ravi Shah and Mia Chen can edit this project.</Text>
					</DialogBody>
					<DialogFooter>
						<Button variant="plain" onClick={() => setOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogPanel>
			</Dialog>
		</>
	)
}

function GlassDrawer() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Comments
			</Button>
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerPanel>
					<DrawerTitle>Comments</DrawerTitle>
					<DrawerBody>
						<Text tone="muted">Tanya Fox approved the new header.</Text>
					</DrawerBody>
					<DrawerFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</DrawerFooter>
				</DrawerPanel>
			</Drawer>
		</>
	)
}

function GlassSheet() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Details
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetPanel side="left">
					<SheetTitle>Project details</SheetTitle>
					<SheetBody>
						<Text tone="muted">Wade Cooper created this project on June 18.</Text>
					</SheetBody>
					<SheetFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</SheetFooter>
				</SheetPanel>
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
