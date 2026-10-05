import { useState } from 'react'
import { PdfViewer } from 'ui/pdf-viewer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { pages, regions } from './statement.ts'

export default function Highlights() {
	const [active, setActive] = useState<string | null>(null)

	const label = regions.find((region) => region.id === active)?.label

	return (
		<Stack gap="md">
			<PdfViewer
				pages={pages}
				highlights={regions}
				onActiveHighlightChange={setActive}
				aria-label="Statement with highlights"
			/>
			<Text tone="muted">Selected: {label ?? 'None'}</Text>
		</Stack>
	)
}
