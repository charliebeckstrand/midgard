import { useComposedRefs } from 'motion/react'
import { type ComponentType, type ReactNode, useEffect, useState } from 'react'
import { CodeBlock, primeCodeBlock } from 'ui/code'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Link } from 'ui/link'
import { defineMessage, defineMessages, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { useIsRtl } from '../../hooks/use-is-rtl.ts'
import { usePanelResize } from '../../hooks/use-panel-resize.ts'
import { BreakpointFrame } from '../../primitives/breakpoint-frame/breakpoint-frame.tsx'
import { sen } from '../../recipes/kiso/index.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { createLazyModule, type LazyModule } from '../../utilities/lazy-module.ts'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'
import { exampleTitle } from './names.ts'
import { useLoadThenOpen } from './use-load-then-open.ts'

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
})

// The size of the instance area in pixels, such as "640 × 480".
const sizeMessage = defineMessage<{ width: number; height: number }>({
	id: 'docs.example.size',
	defaultMessage: '{width} × {height}',
	description:
		'The size of an example in pixels, which shows while the reader resizes the example, such as "640 × 480".',
})

function isExample(component: object): component is ExampleMeta {
	return 'title' in component && 'code' in component
}

/**
 * The {@link ExampleMeta} that the plugin adds to the default export of an
 * example module. It throws for any other component.
 */
export function getMeta(component: { readonly name: string }): ExampleMeta {
	if (!isExample(component)) {
		throw new Error(`docs: ${component.name} is not the default export of an example in pages/`)
	}

	return component
}

// The code of each example, as a chunk. Each frame of an example shares the
// load, and the examples of a folder share one code module.
const codeModules = new WeakMap<ExampleMeta, LazyModule<ExampleCode>>()

/** The code of the example of `meta`, as a chunk that loads once. */
function getCodeModule(meta: ExampleMeta): LazyModule<ExampleCode> {
	return getOrCompute(codeModules, meta, () =>
		createLazyModule(() =>
			meta.code().then((code) => {
				// The markup from the build paints in the first frame of the block.
				primeCodeBlock({ code: code.code, ...code.highlight })

				return code
			}),
		),
	)
}

function Code({
	code,
	print,
}: {
	code: ExampleCode | null
	print?: (code: ExampleCode) => string
}) {
	if (!code) return null

	return (
		<CodeBlock
			code={print ? print(code) : code.code}
			className="rounded-t-none border-t border-zinc-200 dark:border-zinc-800"
		/>
	)
}

/**
 * The width and the height of `target` in pixels, in the top end corner of the
 * frame. It shows only while `active`, and it measures only then, so the size
 * of an idle frame renders nothing.
 */
function FrameSize({ target, active }: { target: HTMLElement | null; active: boolean }) {
	const intl = useIntl()

	const [size, setSize] = useState<{ width: number; height: number } | null>(null)

	useEffect(() => {
		if (!active || target === null) return

		// The observer reports the size at once, and then each change.
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return

			setSize({
				width: Math.round(entry.contentRect.width),
				height: Math.round(entry.contentRect.height),
			})
		})

		observer.observe(target)

		return () => {
			observer.disconnect()

			setSize(null)
		}
	}, [active, target])

	if (!active || size === null) return null

	return (
		<span
			aria-hidden
			data-slot="example-size"
			className="pointer-events-none absolute end-2 top-2 z-10 rounded-md bg-zinc-950/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums dark:bg-white/80 dark:text-zinc-950"
		>
			{intl.formatMessage(sizeMessage, size)}
		</span>
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

// The viewport of an example stops at its CSS minimum height.
function viewportFloor(viewport: HTMLElement): number {
	return Number.parseFloat(getComputedStyle(viewport).minHeight)
}

// The viewport of an example stops at the height of the window, as no page
// has a viewport that is taller than the window.
function viewportCeiling(viewport: HTMLElement): number {
	return Math.max(window.innerHeight, viewportFloor(viewport))
}

/** The props of an example frame that set the box of the instance. */
export type FrameOptions = {
	/** Makes the instance box fill the frame, for a surface of a page. */
	surface?: boolean
	/**
	 * Makes the instance box fill the frame, and starts the frame at half the
	 * column, for a surface that keeps an aspect ratio.
	 */
	ratio?: boolean
	/**
	 * Makes the instance area a viewport of 32rem in height, for an instance that
	 * opens an overlay, a popover, or a toast. The surfaces stay in the area.
	 */
	viewport?: boolean
	/**
	 * Adds a drag on the bottom border of the instance area that sets the height
	 * of the viewport. It has an effect only with `viewport`.
	 */
	heightControl?: boolean
	/**
	 * Makes the instance the page of the viewport, for a layout such as
	 * `SidebarLayout`. The instance fills the viewport with no padding, as a
	 * layout fills a window. It has an effect only with `viewport`.
	 */
	page?: boolean
}

/**
 * The box of the instance. A `page` is the page of the viewport, with no
 * padding. Each other instance is in a padded flex box, which fills the area
 * with `fill`, and is as wide as the instance otherwise.
 */
function InstanceBox({
	fill,
	page,
	children,
}: {
	fill: boolean
	page: boolean
	children: ReactNode
}) {
	if (page) return <div data-slot="example-instance">{children}</div>

	return (
		<div className="p-4">
			<Stack
				data-slot="example-instance"
				gap="lg"
				className={
					fill
						? 'w-full'
						: 'w-max min-w-[min(24rem,100%)] max-w-full phrasing:flex-row phrasing:flex-wrap phrasing:items-center'
				}
			>
				{children}
			</Stack>
		</div>
	)
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
 * sits across the border. While the drag continues, the top end corner of the
 * frame shows the width and the height of the instance area in pixels.
 *
 * The instance area is a breakpoint frame (`BreakpointFrame`). Its breakpoints
 * read the width of the area and not the width of the viewport, in the CSS
 * (`app.css`) and in `useResponsiveValue`. Thus the instance changes at each
 * breakpoint as a page does when a reader makes the window narrower.
 *
 * A dialog, a popover, or a toast of an instance goes to the body, and reads
 * the viewport. With `viewport`, the area is a viewport for these surfaces
 * too, as a window is for a page. The area is 32rem high, and the instance
 * scrolls in it. Each surface renders in the area, covers only the area, and
 * reads the breakpoints of the area. With `heightControl` also, a drag on the
 * bottom border of the area sets its height, from 10rem to the height of the
 * window. The size readout shows during that drag too. With `page` also, the
 * instance is the page of the viewport: it has no padding, and `100cqh` in
 * it is the height of the area. A layout thus fills the area as it fills a
 * window, and its drawers and sheets stay in the area.
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
 *
 * A surface that keeps an aspect ratio, such as a chart, a map, a document
 * viewer, or a grid of photos, gets taller as it gets wider. In the full column,
 * it can be taller than the screen. With `ratio`, the box fills the frame, and
 * the frame starts at half the column but not narrower than 32rem. The frame
 * does not become wider than the column. A drag sets the width as for each
 * other frame.
 */
export function ExampleFrame({
	meta,
	actions,
	print,
	surface = false,
	ratio = false,
	viewport = false,
	heightControl = false,
	page = false,
	children,
}: FrameOptions & {
	meta: ExampleMeta
	/** The controls on a line under the title, such as the fields of a playground. */
	actions?: ReactNode
	/** Writes the code of the block. The block shows the code of the file when it is not given. */
	print?: (code: ExampleCode) => string
	children: ReactNode
}) {
	// The code module loads in idle time, so "Show code" opens at once. It loads
	// before that when the reader points at "Show code" or focuses it.
	const {
		module: code,
		open,
		change,
		warm,
	} = useLoadThenOpen({
		initial: false,
		lazy: getCodeModule(meta),
	})

	// The frame stays at its start edge, and the drag moves its end edge.
	const rtl = useIsRtl()

	const intl = useIntl()

	const title = exampleTitle(intl, meta.id, meta.title)

	const resize = usePanelResize({
		side: rtl ? 'right' : 'left',
		open: true,
		getFloor: frameFloor,
		getCeiling: frameCeiling,
		cursor: 'ew-resize',
	})

	// The drag on the bottom border sets the height of the viewport. A panel
	// that docks to the top edge grows as the pointer moves down.
	const heightResize = usePanelResize({
		side: 'top',
		open: true,
		getFloor: viewportFloor,
		getCeiling: viewportCeiling,
		cursor: 'ns-resize',
	})

	const resizesHeight = viewport && heightControl

	// The instance area, as state, so the size readout observes it once it exists.
	const [area, setArea] = useState<HTMLDivElement | null>(null)

	const areaRef = useComposedRefs<HTMLDivElement>(
		setArea,
		resizesHeight ? heightResize.ref : undefined,
	)

	const dragging =
		resize.handleProps['data-dragging'] !== undefined ||
		heightResize.handleProps['data-dragging'] !== undefined

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
				className={
					ratio ? 'relative w-[max(50%,32rem)] min-w-40 max-w-full' : 'relative min-w-40 max-w-full'
				}
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
						className={cn(
							"pointer-events-auto absolute inset-x-0 top-[calc(50%-1.5rem)] hidden h-12 touch-none after:absolute after:inset-y-2 after:start-[calc(50%-3px)] after:w-[5px] after:content-[''] pointer-coarse:block",
							sen.grip,
						)}
					/>
				</div>
				<div className="overflow-auto rounded-lg border border-zinc-200 peer-hover:border-zinc-400 peer-data-dragging:border-zinc-400 dark:border-zinc-800 dark:peer-hover:border-zinc-600 dark:peer-data-dragging:border-zinc-600">
					<div className="relative">
						{/* The breakpoint frame has no padding, so its width is the width that its container query reads. */}
						<BreakpointFrame
							ref={areaRef}
							viewport={viewport}
							style={
								resizesHeight && heightResize.size !== null
									? { height: heightResize.size }
									: undefined
							}
							className={viewport ? 'h-[32rem] min-h-40' : undefined}
						>
							<InstanceBox fill={surface || ratio} page={viewport && page}>
								{children}
							</InstanceBox>
						</BreakpointFrame>
						{resizesHeight && (
							// The drag area sits across the bottom border of the area, as the
							// drag area of the width sits across the end border.
							<div
								aria-hidden
								data-slot="example-resize-height"
								onPointerDown={heightResize.handleProps.onPointerDown}
								data-dragging={heightResize.handleProps['data-dragging']}
								className="group absolute inset-x-0 -bottom-3 z-10 h-6 cursor-ns-resize touch-pan-x select-none pointer-coarse:pointer-events-none"
							>
								<div className="absolute inset-x-0 top-1/2 h-px group-hover:bg-zinc-400 group-data-dragging:bg-zinc-400 pointer-coarse:hidden dark:group-hover:bg-zinc-600 dark:group-data-dragging:bg-zinc-600" />
								{/* The bar has an odd height, so it centers on the 1px border at whole pixels. */}
								<div
									data-slot="example-resize-height-grip"
									className={cn(
										"pointer-events-auto absolute inset-y-0 start-[calc(50%-1.5rem)] hidden w-12 touch-none after:absolute after:inset-x-2 after:top-[calc(50%-3px)] after:h-[5px] after:content-[''] pointer-coarse:block",
										sen.grip,
									)}
								/>
							</div>
						)}
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
							<Code code={code} print={print} />
						</CollapsePanel>
					</Collapse>
				</div>
				<FrameSize target={area} active={dragging} />
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
	...options
}: FrameOptions & {
	of: ComponentType
}) {
	return (
		<ExampleFrame meta={getMeta(Of)} {...options}>
			<Of />
		</ExampleFrame>
	)
}
