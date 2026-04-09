import { useState } from 'react'
import { Button } from '../../components/button'
import { Drawer, DrawerActions, DrawerBody, DrawerTitle } from '../../components/drawer'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function DrawerDemo() {
	const [open, setOpen] = useState(false)
	const [glassOpen, setGlassOpen] = useState(false)

	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Drawer, DrawerActions, DrawerBody, DrawerDescription, DrawerTitle } from 'ui/drawer'
					import { Button } from 'ui/button'

					<Drawer open={open} onClose={onClose}>
						<DrawerTitle>Drawer Title</DrawerTitle>
						<DrawerBody>
							<p>Drawer content goes here.</p>
						</DrawerBody>
						<DrawerActions>
							<Button variant="plain" onClick={onClose}>Close</Button>
						</DrawerActions>
					</Drawer>
				`}
			>
				<Button onClick={() => setOpen(true)}>Open Drawer</Button>
				<Drawer open={open} onClose={() => setOpen(false)}>
					<DrawerTitle>Drawer</DrawerTitle>
					<DrawerBody>
						<p className="text-sm text-zinc-500">Slides up from the bottom.</p>
					</DrawerBody>
					<DrawerActions>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</DrawerActions>
				</Drawer>
			</Example>

			<Example
				title="Glass"
				code={code`
					import { Drawer, DrawerBody, DrawerTitle } from 'ui/drawer'
					import { Button } from 'ui/button'

					<Drawer glass open={open} onClose={onClose}>
						<DrawerTitle>Glass Drawer</DrawerTitle>
						<DrawerBody>
							<p>Transparent panel over the backdrop.</p>
						</DrawerBody>
					</Drawer>
				`}
			>
				<Button variant="outline" onClick={() => setGlassOpen(true)}>
					Open Glass Drawer
				</Button>
				<Drawer glass open={glassOpen} onClose={() => setGlassOpen(false)}>
					<DrawerTitle>Glass Drawer</DrawerTitle>
					<DrawerBody>
						<p className="text-sm dark:text-zinc-500">Transparent panel from the bottom.</p>
					</DrawerBody>
					<DrawerActions>
						<Button onClick={() => setGlassOpen(false)}>Close</Button>
					</DrawerActions>
				</Drawer>
			</Example>
		</div>
	)
}
