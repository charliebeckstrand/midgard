import { useState } from 'react'
import { PdfViewer, type PdfViewerMagnifierState } from 'ui/pdf-viewer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { pages } from './statement.ts'

function MagnifierSummary({ state }: { state: PdfViewerMagnifierState | null }) {
	if (!state) return 'None'

	return state.enabled
		? `On, zoom ${state.zoom}, size ${state.size}, delay ${state.delay}`
		: `Off, zoom ${state.zoom}, size ${state.size}, delay ${state.delay}`
}

export default function MagnifierSettings() {
	const [state, setState] = useState<PdfViewerMagnifierState | null>(null)

	return (
		<Stack gap="md">
			<PdfViewer
				pages={pages}
				magnifier={{ mode: 'config' }}
				onMagnifierChange={setState}
				aria-label="Invoice 1046"
			/>
			<Text tone="muted">
				Last change: <MagnifierSummary state={state} />
			</Text>
		</Stack>
	)
}
