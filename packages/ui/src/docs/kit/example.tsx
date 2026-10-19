import { type ComponentType, type ReactNode, useCallback } from 'react'
import { CodeBlock, primeCodeBlock } from 'ui/code'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Link } from 'ui/link'
import { defineMessages, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { useIsRtl } from '../../hooks/use-is-rtl.ts'
import { usePanelResize } from '../../hooks/use-panel-resize.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'
import { exampleTitle } from './example-title.ts'
import { useLoadThenOpen } from './load-then-open.ts'

const messages = defineMessages({
	showCode: {
		id: 'docs.example.showCode',
		defaultMessage: 'Show code',
		description:
			'The label of the button under an example that shows the source code of the example.',
	},
	hideCode: {
		id: 'docs.example.hideCode',
		defaultMessage: 'Hide code',
		description:
			'The label of the button under an example that hides the source code of the example.',
	},
	playground: {
		id: 'docs.example.playground',
		defaultMessage: 'Playground',
		description:
			'The heading of the first example of a page, where the reader changes the props of the component to see the result.',
	},
})

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

// Each example loads its code once, and each frame of it shares the load. The
// examples of a folder share one code module. A load that fails keeps its
// failure, as the browser does.
const loads = new WeakMap<ExampleMeta, Promise<void>>()

// The code of each example whose load succeeded. A frame reads it in the
// render, so an open block paints its code in the frame that opens it.
const codes = new WeakMap<ExampleMeta, ExampleCode>()

/** Loads the code of the example of `meta`, once. */
export function loadCode(meta: ExampleMeta): Promise<void> {
	return getOrCompute(loads, meta, () =>
		meta.code().then((code) => {
			// The markup from the build paints in the first frame of the block.
			primeCodeBlock({ code: code.code, ...code.highlight })

			codes.set(meta, code)
		}),
	)
}

function Code({ meta, print }: { meta: ExampleMeta; print?: (code: ExampleCode) => string }) {
	const code = codes.get(meta)

	if (!code) return null

	return (
		<CodeBlock
			code={print ? print(code) : code.code}
			className="rounded-t-none border-t border-zinc-200 dark:border-zinc-800"
		/>
	)
}

// The frame stops at its CSS minimum width.
function frameFloor(frame: HTMLElement): number {
	return Number.parseFloat(getComputedStyle(frame).minWidth)
}

// The frame stops at the width of its column.
function frameCeiling(frame: HTMLElement): number {
	return frame.parentElement?.clientWidth ?? frame.clientWidth
}

/**
 * The frame of an example: the title, the instance, and "Show code".
 *
 * The title is a link to the frame. Its id is the file name of the example,
 * such as `with-icon`, so a reader can share the address of one example.
 *
 * The instance box is as wide as the instance, and at least 24rem, as a form
 * column on a page. When each child of the box is phrasing content, such as a
 * button or a badge, the children make a row that wraps. Otherwise they stack.
 * The box is a flex box, and its gap spaces the children. A margin does not
 * cross a wrapper that has `display: contents`, such as the wrapper of a menu,
 * but the gap does.
 * A drag on the end border of the frame resizes the frame, so a reader can see
 * how the instance responds to a narrow column. The drag area is 24px wide and
 * sits across the border.
 *
 * Where the primary pointer is coarse, only a grip at the middle of the border
 * resizes the frame. The grip takes the whole touch, so a drag in any direction
 * resizes. The rest of the border lets the touch through, so a vertical swipe
 * there scrolls the page. A drag area that both scrolls and resizes cannot work
 * on a touch screen. The browser takes a diagonal drag for a scroll and cancels
 * the pointer, so the frame goes back to its width at the press.
 *
 * A surface of a page, such as a chart, a map, or a document viewer, takes the
 * width of its container and has no width of its own. In a box that is as
 * wide as its content, it gets only the 24rem minimum. With `surface`, the
 * box fills the frame.
 */
export function ExampleFrame({
	meta,
	actions,
	print,
	surface = false,
	children,
}: {
	meta: ExampleMeta
	/** The controls on a line under the title, such as the fields of a playground. */
	actions?: ReactNode
	/** Writes the code of the block. The block shows the code of the file when it is not given. */
	print?: (code: ExampleCode) => string
	/** Makes the instance box fill the frame, for a surface of a page. */
	surface?: boolean
	children: ReactNode
}) {
	// The code module loads in idle time, so "Show code" opens at once. It loads
	// before that when the reader points at "Show code" or focuses it.
	const load = useCallback(() => loadCode(meta), [meta])

	const { open, change, warm } = useLoadThenOpen({
		initial: false,
		load,
		loaded: () => codes.has(meta),
	})

	// The frame stays at its start edge, and the drag moves its end edge.
	const isRtl = useIsRtl()

	const intl = useIntl()

	// The title of an example comes from its file name, and the docs catalog
	// translates it. The title of a playground is the same on each page.
	const title =
		meta.component === undefined
			? exampleTitle(intl, meta.id, meta.title)
			: intl.formatMessage(messages.playground)

	const resize = usePanelResize({
		side: isRtl ? 'right' : 'left',
		open: true,
		floorOf: frameFloor,
		ceilingOf: frameCeiling,
		cursor: 'ew-resize',
	})

	return (
		<Stack gap="sm" data-slot="example">
			<Flex gap="md" direction="col" align="start">
				<Heading level={2} id={meta.id}>
					<Link href={`#${meta.id}`}>{title}</Link>
				</Heading>
				{actions}
			</Flex>
			<div
				ref={resize.ref}
				style={resize.size === null ? undefined : { width: resize.size }}
				className="relative min-w-40 max-w-full"
			>
				{/* The drag area comes before the box, so the box can show the border as active. */}
				<div
					aria-hidden
					data-slot="example-resize"
					onPointerDown={resize.handleProps.onPointerDown}
					data-dragging={resize.handleProps['data-dragging']}
					className="peer absolute inset-y-0 -end-3 z-10 w-6 cursor-ew-resize touch-pan-y select-none pointer-coarse:pointer-events-none"
				>
					{/* The bar has an odd width, so it centers on the 1px border at whole pixels. */}
					<div
						data-slot="example-resize-grip"
						className="pointer-events-auto absolute inset-x-0 top-[calc(50%-1.5rem)] hidden h-12 touch-none after:absolute after:inset-y-2 after:start-[calc(50%-3px)] after:w-[5px] after:rounded-full after:bg-zinc-400 after:content-[''] pointer-coarse:block dark:after:bg-zinc-600"
					/>
				</div>
				<div className="overflow-auto rounded-lg border border-zinc-200 peer-hover:border-zinc-400 peer-data-dragging:border-zinc-400 dark:border-zinc-800 dark:peer-hover:border-zinc-600 dark:peer-data-dragging:border-zinc-600">
					<div className="p-4">
						<Stack
							data-slot="example-instance"
							gap="lg"
							className={
								surface
									? 'w-full'
									: 'w-max min-w-[min(24rem,100%)] max-w-full phrasing:flex-row phrasing:flex-wrap phrasing:items-center'
							}
						>
							{children}
						</Stack>
					</div>
					<Collapse animate="slide" open={open} onOpenChange={(next) => change(() => next)}>
						<div className="border-t border-zinc-200 dark:border-zinc-800">
							<CollapseTrigger
								className="flex px-4 py-2 text-sm focus-visible:-outline-offset-2"
								onPointerEnter={warm}
								onPointerDown={warm}
								onFocus={warm}
							>
								{intl.formatMessage(open ? messages.hideCode : messages.showCode)}
							</CollapseTrigger>
						</div>
						<CollapsePanel>
							<Code meta={meta} print={print} />
						</CollapsePanel>
					</Collapse>
				</div>
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
export function Example({
	of: Of,
	surface,
}: {
	of: ComponentType
	/** Makes the instance box fill the frame, for a surface of a page. */
	surface?: boolean
}) {
	return (
		<ExampleFrame meta={metaOf(Of)} surface={surface}>
			<Of />
		</ExampleFrame>
	)
}
