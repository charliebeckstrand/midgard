import { useState } from 'react'
import { Button } from '../../components/button'
import {
	Sheet,
	SheetActions,
	SheetBody,
	SheetDescription,
	SheetTitle,
} from '../../components/sheet'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function SheetDemo() {
	const [leftOpen, setLeftOpen] = useState(false)
	const [rightOpen, setRightOpen] = useState(false)

	return (
		<Example
			code={`import { Sheet, SheetActions, SheetBody, SheetDescription, SheetTitle } from 'ui/sheet'
import { Button } from 'ui/button'

<Sheet open={open} onClose={onClose}>
	<SheetTitle>Sheet Title</SheetTitle>
	<SheetDescription>Description text.</SheetDescription>
	<SheetBody>
		<p>Sheet content goes here.</p>
	</SheetBody>
	<SheetActions>
		<Button variant="plain" onClick={onClose}>Close</Button>
	</SheetActions>
</Sheet>`}
		>
			<div className="flex gap-3">
				<Button variant="outline" onClick={() => setLeftOpen(true)}>
					Open Left
				</Button>
				<Sheet side="left" open={leftOpen} onClose={() => setLeftOpen(false)}>
					<SheetTitle>Left Sheet</SheetTitle>
					<SheetBody>
						<p className="text-sm text-zinc-500">Slides from the left.</p>
					</SheetBody>
				</Sheet>

				<Button onClick={() => setRightOpen(true)}>Open Right</Button>
				<Sheet open={rightOpen} onClose={() => setRightOpen(false)}>
					<SheetTitle>Sheet Title</SheetTitle>
					<SheetDescription>This is a sheet panel sliding from the right.</SheetDescription>
					<SheetBody>
						<p className="text-sm text-zinc-500">Sheet content goes here.</p>
					</SheetBody>
					<SheetActions>
						<Button variant="plain" onClick={() => setRightOpen(false)}>
							Close
						</Button>
					</SheetActions>
				</Sheet>
			</div>
		</Example>
	)
}
