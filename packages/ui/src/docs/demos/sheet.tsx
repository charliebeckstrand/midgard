import { Example } from 'docs'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Sheet, SheetBody, SheetFooter, SheetTitle } from '../../components/sheet'

export function Demo() {
	const [leftOpen, setLeftOpen] = useState(false)
	const [rightOpen, setRightOpen] = useState(false)
	const [glassLeftOpen, setGlassLeftOpen] = useState(false)
	const [glassRightOpen, setGlassRightOpen] = useState(false)

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
		</>
	)
}
