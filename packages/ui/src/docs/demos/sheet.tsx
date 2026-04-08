import { useState } from 'react'
import { Button } from '../../components/button'
import { Sheet, SheetActions, SheetBody, SheetTitle } from '../../components/sheet'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function SheetDemo() {
	const [leftOpen, setLeftOpen] = useState(false)
	const [rightOpen, setRightOpen] = useState(false)
	const [glassLeftOpen, setGlassLeftOpen] = useState(false)
	const [glassRightOpen, setGlassRightOpen] = useState(false)

	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Sheet, SheetActions, SheetBody, SheetDescription, SheetTitle } from 'ui/sheet'
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
					</Sheet>
				`}
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
						<SheetTitle>Right Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">Slides from the right.</p>
						</SheetBody>
						<SheetActions>
							<Button variant="plain" onClick={() => setRightOpen(false)}>
								Close
							</Button>
						</SheetActions>
					</Sheet>
				</div>
			</Example>

			<Example
				title="Glass"
				code={code`
					import { Sheet, SheetBody, SheetTitle } from 'ui/sheet'
					import { Button } from 'ui/button'

					<Sheet glass open={open} onClose={onClose}>
						<SheetTitle>Glass Sheet</SheetTitle>
						<SheetBody>
							<p>Transparent panel over the backdrop.</p>
						</SheetBody>
					</Sheet>
				`}
			>
				<div className="flex gap-3">
					<Button variant="outline" onClick={() => setGlassLeftOpen(true)}>
						Open Left
					</Button>
					<Sheet glass side="left" open={glassLeftOpen} onClose={() => setGlassLeftOpen(false)}>
						<SheetTitle>Glass Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">Transparent panel from the left.</p>
						</SheetBody>
						<SheetActions>
							<Button variant="plain" onClick={() => setGlassLeftOpen(false)}>
								Close
							</Button>
						</SheetActions>
					</Sheet>

					<Button variant="outline" onClick={() => setGlassRightOpen(true)}>
						Open Right
					</Button>
					<Sheet glass open={glassRightOpen} onClose={() => setGlassRightOpen(false)}>
						<SheetTitle>Glass Sheet</SheetTitle>
						<SheetBody>
							<p className="text-sm text-zinc-500">Transparent panel from the right.</p>
						</SheetBody>
					</Sheet>
				</div>
			</Example>
		</div>
	)
}
