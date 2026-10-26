import { useState } from 'react'
import { Code } from 'ui/code'
import { PdfViewer, type PdfViewerMagnifierState } from 'ui/pdf-viewer'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { pages } from './statement.ts'

function MagnifierSummary({ state }: { state: PdfViewerMagnifierState | null }) {
	if (!state) return 'None'

	// The settings are tokens of the API, so they show as code in each language.
	return (
		<>
			{state.enabled ? 'On' : 'Off'}, zoom <Code>{state.zoom}</Code>, size <Code>{state.size}</Code>
			, delay <Code>{state.delay}</Code>
		</>
	)
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
