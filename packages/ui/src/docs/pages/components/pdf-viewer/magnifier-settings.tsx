import { useState } from 'react'
import { PdfViewer, type PdfViewerMagnifierState } from 'ui/pdf-viewer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { pages } from './statement.ts'

export default function MagnifierSettings() {
	const [state, setState] = useState<PdfViewerMagnifierState | null>(null)

	const summary = state
		? `${state.enabled ? 'on' : 'off'}, zoom ${state.zoom}, size ${state.size}, delay ${state.delay}`
		: 'press the lens button in the toolbar'

	return (
		<Stack gap="md">
			<PdfViewer
				pages={pages}
				magnifier={{ mode: 'config' }}
				onMagnifierChange={setState}
				aria-label="Statement with magnifier settings"
			/>
			<Text tone="muted">Magnifier: {summary}</Text>
		</Stack>
	)
}
