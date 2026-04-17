import { useState } from 'react'
import { Button } from '../../components/button'
import { Drawer, DrawerActions, DrawerBody, DrawerTitle } from '../../components/drawer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

export default function DrawerDemo() {
	const [open, setOpen] = useState(false)
	const [glassOpen, setGlassOpen] = useState(false)

	return (
		<Stack gap={6}>
			<Example title="Default">
				<Button onClick={() => setOpen(true)}>Open Drawer</Button>
				<Drawer open={open} onOpenChange={setOpen}>
					<DrawerTitle>Drawer</DrawerTitle>
					<DrawerBody>
						<p className="text-sm text-zinc-500">Slides up from the bottom.</p>
					</DrawerBody>
					<DrawerActions>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</DrawerActions>
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
					<DrawerActions>
						<Button onClick={() => setGlassOpen(false)}>Close</Button>
					</DrawerActions>
				</Drawer>
			</Example>
		</Stack>
	)
}
