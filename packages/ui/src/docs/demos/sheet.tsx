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
		<Stack gap="xl">
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
						<SheetActions>
							<Button onClick={() => setLeftOpen(false)}>Close</Button>
						</SheetActions>
					</Sheet>

					<Button onClick={() => setRightOpen(true)}>Open Right</Button>

					<Sheet open={rightOpen} onOpenChange={setRightOpen}>
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
				<Flex gap="md">
					<Button variant="outline" onClick={() => setGlassLeftOpen(true)}>
						Open Left
					</Button>

					<Sheet glass side="left" open={glassLeftOpen} onOpenChange={setGlassLeftOpen}>
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

					<Sheet glass open={glassRightOpen} onOpenChange={setGlassRightOpen}>
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
