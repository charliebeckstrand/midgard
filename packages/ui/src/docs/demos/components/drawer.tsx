import { useState } from 'react'
import { Button } from '../../../components/button'
import {
	Drawer,
	DrawerBody,
	DrawerFooter,
	DrawerStatic,
	DrawerTitle,
	DrawerTrigger,
} from '../../../components/drawer'
import { Text } from '../../../components/text'
import { Axes, Example, Opener } from '../../engine'

const LoremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh. Mauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam sodales hendrerit.`

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
								className="block w-full py-2 text-start text-sm"
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

export function Demo() {
	return (
		<>
			{/* With `handle` on a `half` or `full` drawer, drag the grip to resize, or
			    focus it and use the arrow keys. The panel never shrinks past its own
			    header and footer. */}
			<Axes
				of="Drawer"
				captions={false}
				omit={['open', 'defaultOpen', 'animateOnMount', 'size', 'glass', 'desaturate']}
				render={(props, label) => (
					<Opener>
						<DrawerTrigger>
							<Button variant="outline">{label}</Button>
						</DrawerTrigger>

						<Drawer {...props}>
							<DrawerTitle>{label}</DrawerTitle>

							<DrawerBody>
								<Text>
									Press the backdrop, press Escape, or use the button to close the drawer.
								</Text>
							</DrawerBody>

							{/* With no footer of its own, the drawer shows the standard Close button. */}
						</Drawer>
					</Opener>
				)}
			/>

			{/* The static drawer shows the styling axes with no open overlay. The frame
			    contains its fixed layers, and the text behind it shows through the
			    glass and the desaturated backdrop. */}
			<Axes
				of="DrawerStatic"
				captions={false}
				title="Static drawer"
				// A height is a share of the screen, so the drawer above shows it at its true size.
				// The grip shows only at a `half` or `full` height, so it goes with the height.
				omit={['height', 'handle']}
				render={(props, label) => (
					<div className="relative h-[55dvh] w-60 overflow-hidden rounded-lg border border-zinc-200 [contain:paint] dark:border-zinc-800">
						<Text className="p-4 text-blue-600 dark:text-blue-400">{LoremIpsum}</Text>

						<DrawerStatic {...props}>
							<DrawerTitle>{label}</DrawerTitle>

							<DrawerBody>
								<Text>A picture of the open drawer.</Text>
							</DrawerBody>
						</DrawerStatic>
					</div>
				)}
			/>

			{/* Open a line and come back: the panel travels between the two heights
			    rather than snapping, and stops at the screen rather than short of it
			    when a step has that much to show. */}
			<Example title="Fit content">
				<FitExample />
			</Example>
		</>
	)
}
