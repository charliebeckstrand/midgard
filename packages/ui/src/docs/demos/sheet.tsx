import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Sheet, SheetActions, SheetBody, SheetTitle } from '../../components/sheet'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

export default function SheetDemo() {
	const [leftOpen, setLeftOpen] = useState(false)
	const [rightOpen, setRightOpen] = useState(false)
	const [glassLeftOpen, setGlassLeftOpen] = useState(false)
	const [glassRightOpen, setGlassRightOpen] = useState(false)

	return (
		<Stack gap={8}>
			<Example title="Default">
				<Flex gap={3}>
					<Button variant="outline" onClick={() => setLeftOpen(true)}>
						Open Left
					</Button>

					<Sheet side="left" open={leftOpen} onClose={() => setLeftOpen(false)}>
						<SheetTitle>Left Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">Slides from the left.</p>
						</SheetBody>
						<SheetActions>
							<Button onClick={() => setLeftOpen(false)}>Close</Button>
						</SheetActions>
					</Sheet>

					<Button onClick={() => setRightOpen(true)}>Open Right</Button>

					<Sheet open={rightOpen} onClose={() => setRightOpen(false)}>
						<SheetTitle>Right Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">Slides from the right.</p>
						</SheetBody>
						<SheetActions>
							<Button onClick={() => setRightOpen(false)}>Close</Button>
						</SheetActions>
					</Sheet>
				</Flex>
			</Example>

			<Example title="Glass">
				<Flex gap={3}>
					<Button variant="outline" onClick={() => setGlassLeftOpen(true)}>
						Open Left
					</Button>

					<Sheet glass side="left" open={glassLeftOpen} onClose={() => setGlassLeftOpen(false)}>
						<SheetTitle>Glass Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm dark:text-zinc-500">Transparent panel from the left.</p>
						</SheetBody>
						<SheetActions>
							<Button onClick={() => setGlassLeftOpen(false)}>Close</Button>
						</SheetActions>
					</Sheet>

					<Button variant="outline" onClick={() => setGlassRightOpen(true)}>
						Open Right
					</Button>

					<Sheet glass open={glassRightOpen} onClose={() => setGlassRightOpen(false)}>
						<SheetTitle>Glass Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm dark:text-zinc-500">Transparent panel from the right.</p>
						</SheetBody>
						<SheetActions>
							<Button onClick={() => setGlassRightOpen(false)}>Close</Button>
						</SheetActions>
					</Sheet>
				</Flex>
			</Example>
		</Stack>
	)
}
