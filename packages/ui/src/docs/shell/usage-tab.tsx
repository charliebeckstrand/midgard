import { CodeBlock } from 'ui/code'
import { Markdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import type { DocModule } from '../engine'
import { printUsage } from '../engine/usage'
import { useSynthesizedDoc } from './synthesis'

/**
 * The Usage tab: the import and a synthesized example on the component's own
 * defaults, then the doc's `## Usage` prose. Deterministic — the example is the
 * one the page renders live, printed here as code, with no controls to reshape it.
 */
export function UsageTab({ doc }: { doc: DocModule }) {
	const { doc: synth } = useSynthesizedDoc(doc.meta)

	const usage = doc.sections.usage

	return (
		<Stack gap="lg">
			{synth && <CodeBlock code={printUsage(synth)} lang="tsx" />}
			{usage && <Markdown>{usage}</Markdown>}
			{!synth && !usage && <Text severity="muted">No usage for this page.</Text>}
		</Stack>
	)
}
