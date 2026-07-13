import { Markdown } from 'ui/markdown'
import { Text } from 'ui/text'
import type { DocModule } from '../engine'

/** The Overview tab: the doc's `## Overview` prose — what the component is and does. */
export function OverviewTab({ doc }: { doc: DocModule }) {
	const overview = doc.sections.overview

	if (!overview) return <Text severity="muted">No overview for this page.</Text>

	return <Markdown>{overview}</Markdown>
}
