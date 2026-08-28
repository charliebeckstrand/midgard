import { useState } from 'react'
import { Button } from '../../../components/button'
import { Drawer, DrawerBody, DrawerFooter, DrawerTitle } from '../../../components/drawer'
import { Flex } from '../../../components/flex'
import { Example } from '../../engine'

const LoremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit.`

function HeightExample({ height, label }: { height: 'half' | 'full'; label: string }) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				{label}
			</Button>

			<Drawer glass height={height} open={open} onOpenChange={setOpen}>
				<DrawerTitle>{label}</DrawerTitle>

				<DrawerBody>
					{LoremIpsum.split('. ').map((line) => (
						<p key={line} className="mb-4 text-sm">
							{line}.
						</p>
					))}
				</DrawerBody>

				<DrawerFooter>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</DrawerFooter>
			</Drawer>
		</>
	)
}

/**
 * A panel navigated within: the crumb swaps what it holds, and `fit` measures
 * each step and travels between the two heights rather than snapping.
 */
function FitExample() {
	const [open, setOpen] = useState(false)

	const [opened, setOpened] = useState<string | null>(null)

	const lines = LoremIpsum.split('. ').slice(0, 6)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Fit content
			</Button>

			<Drawer glass height="fit" open={open} onOpenChange={setOpen}>
				<DrawerTitle>
					{opened === null ? (
						'Six lines'
					) : (
						<Button variant="plain" onClick={() => setOpened(null)}>
							Six lines › this one
						</Button>
					)}
				</DrawerTitle>

				<DrawerBody>
					{opened === null ? (
						lines.map((line) => (
							<button
								key={line}
								type="button"
								className="block w-full py-2 text-left text-sm"
								onClick={() => setOpened(line)}
							>
								{line}.
							</button>
						))
					) : (
						<p className="text-sm">{opened}.</p>
					)}
				</DrawerBody>

				<DrawerFooter>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</DrawerFooter>
			</Drawer>
		</>
	)
}

/** A panel the reader resizes by its own edge. */
function HandleExample() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				Resizable
			</Button>

			<Drawer glass handle height="half" open={open} onOpenChange={setOpen}>
				<DrawerTitle>Drag the grip</DrawerTitle>

				<DrawerBody>
					{LoremIpsum.split('. ').map((line) => (
						<p key={line} className="mb-4 text-sm">
							{line}.
						</p>
					))}
				</DrawerBody>

				<DrawerFooter>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</DrawerFooter>
			</Drawer>
		</>
	)
}

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

			{/* Drag the grip to resize, or focus it and use the arrow keys. The panel
			    never shrinks past its own header and footer, and a downward flick puts
			    it away. */}
			<Example title="Handle">
				<HandleExample />
			</Example>

			<Example title="Height">
				<Flex gap="sm">
					<HeightExample height="half" label="Half screen" />

					<HeightExample height="full" label="Full screen" />

					{/* Open a line and come back: the panel travels between the two
					    heights rather than snapping, and stops at the screen rather than
					    short of it when a step has that much to show. */}
					<FitExample />
				</Flex>
			</Example>
		</>
	)
}
