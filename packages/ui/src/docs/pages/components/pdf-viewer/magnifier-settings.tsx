import { useState } from 'react'
import { PdfViewer, type PdfViewerMagnifierState } from 'ui/pdf-viewer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { pages } from './statement.ts'

export default function MagnifierSettings() {
	const [state, setState] = useState<PdfViewerMagnifierState | null>(null)

	const summary = state
		? `${state.enabled ? 'On' : 'Off'}, zoom ${state.zoom}, size ${state.size}, delay ${state.delay}`
		: 'None'

	return (
		<Stack gap="md">
			<PdfViewer
				pages={pages}
				magnifier={{ mode: 'config' }}
				onMagnifierChange={setState}
				aria-label="Invoice 1046"
			/>
			<Text tone="muted">Last change: {summary}</Text>
		</Stack>
	)
}
