import { useState } from 'react'
import { Button } from '../../components/button'
import { Drawer, DrawerBody, DrawerFooter, DrawerTitle } from '../../components/drawer'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

export function Demo() {
	const [open, setOpen] = useState(false)
	const [glassOpen, setGlassOpen] = useState(false)

	return (
		<>
			<Example title="Default">
				<Button onClick={() => setOpen(true)}>Open Drawer</Button>
				<Drawer open={open} onOpenChange={setOpen}>
					<DrawerTitle>Drawer</DrawerTitle>
					<DrawerBody>
						<p className="text-sm text-zinc-500">Slides up from the bottom.</p>
					</DrawerBody>
					<DrawerFooter>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</DrawerFooter>
				</Drawer>
			</Example>

			<Example title="Glass">
				<Button variant="outline" onClick={() => setGlassOpen(true)}>
					Open Glass Drawer
				</Button>
				<Drawer glass open={glassOpen} onOpenChange={setGlassOpen}>
					<DrawerTitle>Glass Drawer</DrawerTitle>
					<DrawerBody>
						<p className="text-sm dark:text-zinc-500">Transparent panel from the bottom.</p>
					</DrawerBody>
					<DrawerFooter>
						<Button onClick={() => setGlassOpen(false)}>Close</Button>
					</DrawerFooter>
				</Drawer>
			</Example>
		</>
	)
}
