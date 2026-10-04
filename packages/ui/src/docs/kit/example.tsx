import { type ComponentType, type ReactNode, Suspense, use, useState } from 'react'
import { CodeBlock, primeCodeBlock } from 'ui/code'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'

function isExample(component: object): component is ExampleMeta {
	return 'title' in component && 'code' in component
}

/**
 * The {@link ExampleMeta} that the plugin adds to the default export of an
 * example module. It throws for any other component.
 */
export function metaOf(component: { readonly name: string }): ExampleMeta {
	if (!isExample(component)) {
		throw new Error(`docs: ${component.name} is not the default export of an example in pages/`)
	}

	return component
}

// Each example loads its code module once, and each frame of it shares the
// load. A failed load gives no code, so the block stays empty until the next
// page load.
const loads = new WeakMap<ExampleMeta, Promise<ExampleCode | undefined>>()

function loadCode(meta: ExampleMeta): Promise<ExampleCode | undefined> {
	return getOrCompute(loads, meta, () =>
		meta.code().then(
			({ default: code }) => {
				// The markup from the build paints in the first frame of the block.
				primeCodeBlock({ code: code.code, html: code.html })

				return code
			},
			() => undefined,
		),
	)
}

function Code({ meta, print }: { meta: ExampleMeta; print?: (code: ExampleCode) => string }) {
	const code = use(loadCode(meta))

	if (!code) return null

	return (
		<CodeBlock
			code={print ? print(code) : code.code}
			className="rounded-t-none border-t border-zinc-200 dark:border-zinc-800"
		/>
	)
}

/**
 * The frame of an example: the title, the instance, and "Show code".
 *
 * The instance box is as wide as the instance, and at least 24rem, as a form
 * column on a page. When each child of the box is phrasing content, such as a
 * button or a badge, the children make a row that wraps. Otherwise they stack.
 * The frame resizes on its right edge, so a reader can see how the instance
 * responds to a narrow column.
 */
export function ExampleFrame({
	meta,
	actions,
	print,
	children,
}: {
	meta: ExampleMeta
	/** The controls at the end of the title row, such as the fields of a playground. */
	actions?: ReactNode
	/** Writes the code of the block. The block shows the code of the file when it is not given. */
	print?: (code: ExampleCode) => string
	children: ReactNode
}) {
	const [open, setOpen] = useState(false)

	// The code module loads when the reader points at "Show code" or focuses it.
	const prepare = () => {
		loadCode(meta)
	}

	return (
		<Stack gap="sm" data-slot="example">
			<Flex
				gap="md"
				direction={{ initial: 'col', sm: 'row' }}
				align={{ initial: 'start', sm: 'center' }}
				justify={{ initial: 'start', sm: 'between' }}
			>
				<Heading level={3}>{meta.title}</Heading>
				{actions}
			</Flex>
			<div className="min-w-40 max-w-full resize-x overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
				<div className="p-4">
					<div
						data-slot="example-instance"
						className="w-max min-w-[min(24rem,100%)] max-w-full space-y-4 phrasing:flex phrasing:flex-wrap phrasing:items-center phrasing:gap-4 phrasing:space-y-0"
					>
						{children}
					</div>
				</div>
				<Collapse animate="slide" open={open} onOpenChange={setOpen}>
					<div className="border-t border-zinc-200 dark:border-zinc-800">
						<CollapseTrigger
							className="flex px-4 py-2 text-sm focus-visible:-outline-offset-2"
							onPointerEnter={prepare}
							onPointerDown={prepare}
							onFocus={prepare}
						>
							{open ? 'Hide code' : 'Show code'}
						</CollapseTrigger>
					</div>
					<CollapsePanel>
						<Suspense fallback={null}>
							<Code meta={meta} print={print} />
						</Suspense>
					</CollapsePanel>
				</Collapse>
			</div>
		</Stack>
	)
}

/**
 * One static example: the default export of an example module, as it is.
 * "Show code" shows the file of the module.
 *
 * @example
 * import WithIcon from './with-icon.tsx'
 *
 * <Example of={WithIcon} />
 */
export function Example({ of: Of }: { of: ComponentType }) {
	return (
		<ExampleFrame meta={metaOf(Of)}>
			<Of />
		</ExampleFrame>
	)
}
