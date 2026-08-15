import { useState } from 'react'
import { Button } from '../../../components/button'
import { Flex } from '../../../components/flex'
import { Sheet, SheetBody, SheetFooter, SheetTitle } from '../../../components/sheet'
import { Example } from '../../engine'

export function Demo() {
	const [leftOpen, setLeftOpen] = useState(false)
	const [rightOpen, setRightOpen] = useState(false)
	const [glassLeftOpen, setGlassLeftOpen] = useState(false)
	const [glassRightOpen, setGlassRightOpen] = useState(false)
	const [handleOpen, setHandleOpen] = useState(false)
	const [handleLeftOpen, setHandleLeftOpen] = useState(false)

	return (
		<>
			<Example title="Default">
				<Flex gap="md">
					<Button variant="outline" onClick={() => setLeftOpen(true)}>
						Open Left
					</Button>

					<Sheet side="left" open={leftOpen} onOpenChange={setLeftOpen}>
						<SheetTitle>Left Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">Slides from the left.</p>
						</SheetBody>
						<SheetFooter>
							<Button onClick={() => setLeftOpen(false)}>Close</Button>
						</SheetFooter>
					</Sheet>

					<Button onClick={() => setRightOpen(true)}>Open Right</Button>

					<Sheet open={rightOpen} onOpenChange={setRightOpen}>
						<SheetTitle>Right Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">Slides from the right.</p>
						</SheetBody>
						<SheetFooter>
							<Button onClick={() => setRightOpen(false)}>Close</Button>
						</SheetFooter>
					</Sheet>
				</Flex>
			</Example>

			<Example title="Glass">
				<Flex gap="md">
					<Button variant="outline" onClick={() => setGlassLeftOpen(true)}>
						Open Left
					</Button>

					<Sheet glass side="left" open={glassLeftOpen} onOpenChange={setGlassLeftOpen}>
						<SheetTitle>Glass Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm dark:text-zinc-500">Transparent panel from the left.</p>
						</SheetBody>
						<SheetFooter>
							<Button onClick={() => setGlassLeftOpen(false)}>Close</Button>
						</SheetFooter>
					</Sheet>

					<Button variant="outline" onClick={() => setGlassRightOpen(true)}>
						Open Right
					</Button>

					<Sheet glass open={glassRightOpen} onOpenChange={setGlassRightOpen}>
						<SheetTitle>Glass Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm dark:text-zinc-500">Transparent panel from the right.</p>
						</SheetBody>
						<SheetFooter>
							<Button onClick={() => setGlassRightOpen(false)}>Close</Button>
						</SheetFooter>
					</Sheet>
				</Flex>
			</Example>

			<Example title="Handle">
				<Flex gap="md">
					<Button onClick={() => setHandleOpen(true)}>Open Right</Button>

					<Sheet handle open={handleOpen} onOpenChange={setHandleOpen}>
						<SheetTitle>Resizable Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">
								Drag the grip on the inner edge to set the width, or focus it and use the arrow
								keys. A flick toward the edge throws the panel away, and a closed panel reopens at
								the width its variant states.
							</p>
						</SheetBody>
						<SheetFooter>
							<Button onClick={() => setHandleOpen(false)}>Close</Button>
						</SheetFooter>
					</Sheet>

					<Button variant="outline" onClick={() => setHandleLeftOpen(true)}>
						Open Left
					</Button>

					<Sheet handle side="left" open={handleLeftOpen} onOpenChange={setHandleLeftOpen}>
						<SheetTitle>Resizable Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">
								The grip rides whichever edge faces the screen, so a left-hand panel grows
								rightward.
							</p>
						</SheetBody>
						<SheetFooter>
							<Button onClick={() => setHandleLeftOpen(false)}>Close</Button>
						</SheetFooter>
					</Sheet>
				</Flex>
			</Example>
		</>
	)
}
