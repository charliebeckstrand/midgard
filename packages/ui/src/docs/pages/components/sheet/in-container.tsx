import { useState } from 'react'
import { Button } from 'ui/button'
import {
	Sheet,
	SheetBody,
	SheetDescription,
	SheetHeader,
	SheetPanel,
	SheetTitle,
	SheetTrigger,
} from 'ui/sheet'
import { Text } from 'ui/text'

export default function InContainer() {
	const [container, setContainer] = useState<HTMLDivElement | null>(null)

	return (
		// The container must be a positioning context, so it is `relative`.
		<div
			ref={setContainer}
			className="relative h-96 overflow-hidden rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
		>
			<Sheet>
				<SheetTrigger>
					<Button variant="outline">Show details</Button>
				</SheetTrigger>
				<SheetPanel container={container} width="xs">
					<SheetHeader>
						<SheetTitle>brand-guide.pdf</SheetTitle>
						<SheetDescription>PDF document, 2.4 MB</SheetDescription>
					</SheetHeader>
					<SheetBody>
						<Text>
							Jane Smith uploaded this file on March 3. The sheet stays in this box, and the page
							around it still scrolls.
						</Text>
					</SheetBody>
				</SheetPanel>
			</Sheet>
		</div>
	)
}
