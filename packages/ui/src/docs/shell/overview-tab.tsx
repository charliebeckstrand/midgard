import { Suspense } from 'react'
import { Markdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import type { DocMeta, DocModule } from '../engine'
import { DocErrorBoundary } from './error-boundary'
import { LivePreview, useSynthesizedDoc } from './synthesis'

/** The synthesized example, live — a component renders, a callable has nothing to show. */
function OverviewRender({
	meta,
	search,
	seed,
}: {
	meta: DocMeta
	search: URLSearchParams
	seed: number
}) {
	const { symbol, doc } = useSynthesizedDoc(meta, search, seed)

	if (symbol?.kind !== 'component' || !doc) return null

	return (
		<DocErrorBoundary fallback={() => null}>
			<Suspense fallback={null}>
				<LivePreview doc={doc} specifier={meta.module} />
			</Suspense>
		</DocErrorBoundary>
	)
}

/**
 * The Overview tab and default view: the doc's prose, then a live render of the
 * same seeded example the Usage tab shows. The prose renders immediately; the
 * render suspends on the API snapshot in its own boundary, so a component page
 * never blocks its text on the extractor.
 */
export function OverviewTab({
	doc,
	search,
	seed,
}: {
	doc: DocModule
	search: URLSearchParams
	seed: number
}) {
	return (
		<Stack gap="lg">
			{doc.body && <Markdown>{doc.body}</Markdown>}
			<Suspense fallback={null}>
				<OverviewRender meta={doc.meta} search={search} seed={seed} />
			</Suspense>
		</Stack>
	)
}
