import { type ComponentType, type ReactNode, useCallback } from 'react'
import { CodeBlock, primeCodeBlock } from 'ui/code'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/stack'
import { useIsRtl } from '../../hooks/use-is-rtl.ts'
import { usePanelResize } from '../../hooks/use-panel-resize.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'
import { useLoadThenOpen } from './load-then-open.ts'

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

function loadCode(meta: ExampleMeta): Promise<void> {
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
 * The instance box is as wide as the instance, and at least 24rem, as a form
 * column on a page. When each child of the box is phrasing content, such as a
 * button or a badge, the children make a row that wraps. Otherwise they stack.
 * The box is a flex box, and its gap spaces the children. A margin does not
 * cross a wrapper that has `display: contents`, such as the wrapper of a menu,
 * but the gap does.
 * A drag on the end border of the frame resizes the frame, so a reader can see
 * how the instance responds to a narrow column. The drag area is 24px wide and
 * sits across the border, so a finger can find it. A vertical swipe on the drag
 * area scrolls the page, and only a horizontal drag resizes the frame.
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
	const rtl = useIsRtl()

	const resize = usePanelResize({
		side: rtl ? 'right' : 'left',
		open: true,
		floorOf: frameFloor,
		ceilingOf: frameCeiling,
		cursor: 'ew-resize',
	})

	return (
		<Stack gap="sm" data-slot="example">
			<Flex gap="md" direction="col" align="start">
				<Heading level={2}>{meta.title}</Heading>
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
					className="peer absolute inset-y-0 -end-3 z-10 w-6 cursor-ew-resize touch-pan-y select-none"
				/>
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
								{open ? 'Hide code' : 'Show code'}
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
