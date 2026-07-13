import { type ComponentType, lazy, Suspense, useState } from 'react'
import { CodeBlock, type CodeBlockProps } from 'ui/code'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Heading } from 'ui/heading'
import { Markdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import type { DocModule, PreviewBlock } from '../engine'
import { DocErrorBoundary } from './error-boundary'

// `lazy` must see the same component across renders; keyed by the block, which
// is a module-level constant of the loaded doc.
const lazyCache = new WeakMap<PreviewBlock, ComponentType>()

function previewComponent(block: PreviewBlock): ComponentType {
	let component = lazyCache.get(block)

	if (!component) {
		component = lazy(block.load)

		lazyCache.set(block, component)
	}

	return component
}

/**
 * One compiled `tsx preview` fence: the live component in a bordered frame with
 * its verbatim source in a collapsible "Show code" block beneath — the same
 * frame the old docs app's `Example` rendered.
 */
function PreviewFrame({ block }: { block: PreviewBlock }) {
	const Preview = previewComponent(block)

	const [open, setOpen] = useState(false)

	// A fence titled after its own h2 section would print the heading twice;
	// the title earns a heading only when it says something the section doesn't.
	const title = block.title !== block.section ? block.title : undefined

	return (
		<Stack gap="sm" data-slot="doc-preview">
			{title && <Heading level={3}>{title}</Heading>}
			<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
				<div className="overflow-x-auto p-4">
					<DocErrorBoundary
						fallback={() => <Text severity="muted">Couldn't render this example.</Text>}
					>
						<Suspense fallback={null}>
							<Preview />
						</Suspense>
					</DocErrorBoundary>
				</div>
				<Collapse animate="slide" open={open} onOpenChange={setOpen}>
					<div className="border-t border-zinc-200 dark:border-zinc-800">
						<CollapseTrigger className="flex text-sm px-4 py-2 focus-visible:-outline-offset-2">
							{open ? 'Hide code' : 'Show code'}
						</CollapseTrigger>
					</div>
					<CollapsePanel>
						<CodeBlock
							code={block.source}
							className="rounded-t-none border-t border-zinc-200 dark:border-zinc-800"
						/>
					</CollapsePanel>
				</Collapse>
			</div>
		</Stack>
	)
}

/** The Preview tab: the doc's body segments — prose, snippets, live previews — in authored order. */
export function PreviewTab({ doc }: { doc: DocModule }) {
	return (
		<Stack gap="lg">
			{doc.body.map((segment, index) => {
				if (segment.t === 'prose') {
					// biome-ignore lint/suspicious/noArrayIndexKey: segments are static per loaded doc
					return <Markdown key={index}>{segment.md}</Markdown>
				}

				if (segment.t === 'snippet') {
					return (
						<CodeBlock
							// biome-ignore lint/suspicious/noArrayIndexKey: segments are static per loaded doc
							key={index}
							code={segment.code}
							// Fence langs are author-supplied; an unknown grammar falls back to
							// CodeBlock's plain <pre> rendering rather than failing the page.
							lang={segment.lang as CodeBlockProps['lang']}
						/>
					)
				}

				const block = doc.previews[segment.index]

				if (!block) return null

				// biome-ignore lint/suspicious/noArrayIndexKey: segments are static per loaded doc
				return <PreviewFrame key={index} block={block} />
			})}
		</Stack>
	)
}
