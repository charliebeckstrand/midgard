import { useComposedRefs } from 'motion/react'
import {
	type ComponentType,
	type FocusEvent,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { CodeBlock, primeCodeBlock } from 'ui/code'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { cn, createContext } from 'ui/core'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { defineMessage, defineMessages, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { ToastHost } from '../../components/toast/toast-host.tsx'
import { useIsRtl } from '../../hooks/use-is-rtl.ts'
import { usePanelResize } from '../../hooks/use-panel-resize.ts'
import { BreakpointFrame } from '../../primitives/breakpoint-frame/breakpoint-frame.tsx'
import { Splitter } from '../../primitives/splitter/splitter.tsx'
import { sen } from '../../recipes/kiso/index.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { createLazyModule, type LazyModule } from '../../utilities/lazy-module.ts'
import type { ExampleCode, ExampleMeta } from '../plugin/examples.ts'
import { HashAnchor } from './hash-anchor.tsx'
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
	resizeWidth: {
		id: 'docs.example.resizeWidth',
		defaultMessage: 'Resize example width',
		description:
			'The name of the handle on the end border of an example that changes the width of the example, by a drag or by the arrow keys.',
	},
	resizeHeight: {
		id: 'docs.example.resizeHeight',
		defaultMessage: 'Resize example height',
		description:
			'The name of the handle on the bottom border of an example that changes the height of the example, by a drag or by the arrow keys.',
	},
})

// The size of the instance area in pixels, such as "640 × 480".
const sizeMessage = defineMessage<{ width: number; height: number }>({
	id: 'docs.example.size',
	defaultMessage: '{width} × {height}',
	description:
		'The size of an example in pixels, which shows while the reader resizes the example, such as "640 × 480".',
})

// One side of an example in pixels, which a screen reader speaks as the value
// of a resize handle, such as "640 pixels".
const pixelsMessage = defineMessage<{ pixels: number }>({
	id: 'docs.example.pixels',
	defaultMessage: '{pixels} pixels',
	description:
		'The width or the height of an example in pixels, which a screen reader speaks as the value of the handle that resizes the example, such as "640 pixels".',
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

type Size = { width: number; height: number }

/**
 * The width and the height of `target` in pixels, while `active`, and `null`
 * otherwise. It measures only while `active`, so an idle frame does no work.
 * The first size is measured before the paint, so a splitter that takes the
 * focus has its value text at once.
 */
function useFrameSize(target: HTMLElement | null, active: boolean): Size | null {
	const [size, setSize] = useState<Size | null>(null)

	useLayoutEffect(() => {
		if (!active || target === null) return

		setSize({ width: target.clientWidth, height: target.clientHeight })

		// The observer reports each change of the size.
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

	return size
}

/** The size of the instance area, in the top end corner of the frame. */
function FrameSize({ size }: { size: Size }) {
	const intl = useIntl()

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

/**
 * The width of the instance box.
 *
 * - `content`: as wide as the instance, and at least 24rem.
 * - `column`: a form column of 24rem, or the width of a narrower frame, for
 *   fields that fill their container.
 * - `surface`: the width of the frame, for a surface of a page.
 * - `ratio`: the width of the frame, and the frame starts at half the column,
 *   for a surface that keeps an aspect ratio.
 */
export type FrameBox = 'content' | 'column' | 'surface' | 'ratio'

/** The props of an example frame that set the box of the instance. */
export type FrameOptions = {
	/**
	 * Sets the width of the instance box.
	 *
	 * @defaultValue 'content'
	 */
	box?: FrameBox
	/**
	 * Makes the instance area a viewport of 32rem in height, for an instance that
	 * opens an overlay, a popover, or a toast. The instance is at the center of
	 * the area, and the surfaces stay in the area. A drag on the bottom border of
	 * the area sets the height of the viewport.
	 */
	viewport?: boolean
	/**
	 * Makes the instance the page of the viewport, for a layout such as
	 * `SidebarLayout`. The instance fills the viewport with no padding, as a
	 * layout fills a window. It has an effect only with `viewport`.
	 */
	page?: boolean
}

// The frame options of a page. Each frame of the page uses them, and the props
// of a frame override them.
const [FrameDefaultsContext, useFrameDefaults] = createContext<FrameOptions>('FrameDefaults', {
	default: {},
})

/**
 * Gives each example frame in `children` the same frame options. A page whose
 * component opens a portal, such as a dialog or a toast, gives `viewport` to
 * each of its frames in one place, so a new example of the page cannot leave it
 * out. A frame that sets an option overrides the default of the page.
 *
 * @example
 * <FrameDefaults viewport>
 *   <Playground of={DialogPlayground} api={api} />
 *   <Example of={WithForm} />
 * </FrameDefaults>
 */
export function FrameDefaults({ children, ...options }: FrameOptions & { children: ReactNode }) {
	return <FrameDefaultsContext value={options}>{children}</FrameDefaultsContext>
}

// The classes of the instance box for each width. A box that is not the width
// of the frame puts phrasing children on a row that wraps.
const boxClasses: Record<FrameBox, string> = {
	content:
		'w-max min-w-[min(24rem,100%)] max-w-full phrasing:flex-row phrasing:flex-wrap phrasing:items-center',
	column: 'w-sm max-w-full phrasing:flex-row phrasing:flex-wrap phrasing:items-center',
	surface: 'w-full',
	ratio: 'w-full',
}

/**
 * The box of the instance. A `page` is the page of the viewport, with no
 * padding. Each other instance is in a padded flex box, with the width that
 * `box` sets.
 *
 * In a `viewport`, the instance is at the center of the area, so the empty
 * area reads as a stage for the surface that the instance opens. Auto margins
 * center the box, so an instance that is taller than the area starts at the
 * top and scrolls, and is not cut at the top. A surface opens against the
 * area and not against the box, so the box has no minimum width there. A
 * lone trigger is at the center, and a row of triggers that wraps centers each
 * line.
 */
function InstanceBox({
	box,
	page,
	viewport = false,
	children,
}: {
	box: FrameBox
	page: boolean
	viewport?: boolean
	children: ReactNode
}) {
	if (page) return <div data-slot="example-instance">{children}</div>

	return (
		<div className={viewport ? 'flex min-h-full p-4' : 'p-4'}>
			<Stack
				data-slot="example-instance"
				gap="lg"
				className={cn(boxClasses[box], viewport && 'm-auto min-w-0 phrasing:justify-center')}
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
 * By default, the instance box is as wide as the instance, and at least 24rem,
 * as a form column on a page. When each child of the box is phrasing content,
 * such as a button or a badge, the children make a row that wraps. Otherwise
 * they stack.
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
 * too, as a window is for a page. The area is 32rem high, the instance is
 * at the center of the area, and the instance scrolls in it. Each surface
 * renders in the area, covers only the area, and reads the breakpoints of the
 * area. `useToast` in the instance uses a queue of the area, so its toasts
 * also show in the area. A drag on the bottom border of the area sets its
 * height, from 10rem to the height of the window. The size readout shows
 * during that drag too. With `page` also, the instance is the page of the
 * viewport: it has no padding, and `100cqh` in it is the height of the area.
 * A layout thus fills the area as it fills a window, and its drawers and
 * sheets stay in the area.
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
 * wide as its content, it gets only the 24rem minimum. With `box="surface"`,
 * the box fills the frame.
 *
 * A surface that keeps an aspect ratio, such as a chart, a map, a document
 * viewer, or a grid of photos, gets taller as it gets wider. In the full column,
 * it can be taller than the screen. With `box="ratio"`, the box fills the
 * frame, and the frame starts at half the column but not narrower than 32rem.
 * The frame does not become wider than the column. A drag sets the width as for each
 * other frame.
 *
 * A field fills its container, and the page or the form sets the width. In a
 * box that is as wide as its content, a long message or a row of tags makes
 * the box and thus the field wider. With `box="column"`, the box is a form
 * column of 24rem, and the full width of a narrower frame, so each field of a
 * page has the same width. A page of fields gives `box="column"` to each of
 * its frames with {@link FrameDefaults}.
 *
 * A {@link FrameDefaults} around the frame gives the options that the frame
 * does not set.
 */
export function ExampleFrame(
	props: FrameOptions & {
		meta: ExampleMeta
		/** The controls on a line under the title, such as the fields of a playground. */
		actions?: ReactNode
		/** Writes the code of the block. The block shows the code of the file when it is not given. */
		print?: (code: ExampleCode) => string
		children: ReactNode
	},
) {
	const {
		meta,
		actions,
		print,
		box = 'content',
		viewport = false,
		page = false,
		children,
	} = { ...useFrameDefaults(), ...props }

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

	// The instance area, as state, so the size readout observes it once it exists.
	const [area, setArea] = useState<HTMLDivElement | null>(null)

	const areaRef = useComposedRefs<HTMLDivElement>(setArea, viewport ? heightResize.ref : undefined)

	const dragging =
		resize.handleProps['data-dragging'] !== undefined ||
		heightResize.handleProps['data-dragging'] !== undefined

	// A splitter that has the keyboard focus. The size shows while it has the
	// focus, as it shows during a drag, so a keyboard reader sees the size too.
	const [keyFocus, setKeyFocus] = useState(false)

	const size = useFrameSize(area, dragging || keyFocus)

	// The width splitter comes after the box, and the pointer goes through it to
	// the drag area. A press on the drag area moves the focus to the splitter,
	// as a press on the height splitter does, so the arrow keys resize the
	// frame after a drag.
	const widthSplitter = useRef<HTMLHRElement>(null)

	const splitterFocus = {
		onFocus: (event: FocusEvent<HTMLElement>) =>
			setKeyFocus(event.currentTarget.matches(':focus-visible')),
		onBlur: () => setKeyFocus(false),
	}

	return (
		<Stack gap="sm" data-slot="example">
			<Flex gap="md" direction="col" align="start">
				<Heading level={2} id={meta.id}>
					<HashAnchor to={meta.id}>{title}</HashAnchor>
				</Heading>
				{actions}
			</Flex>
			<div
				ref={resize.ref}
				style={resize.size === null ? undefined : { width: resize.size }}
				className={
					box === 'ratio'
						? 'relative w-[max(50%,32rem)] min-w-40 max-w-full'
						: 'relative min-w-40 max-w-full'
				}
			>
				{/* The drag area comes before the box, so the box can show the border as active. */}
				<div
					data-slot="example-resize"
					onPointerDown={(event) => {
						// The default of the press would move the focus to the body, as the
						// drag area takes no focus, so the press prevents it.
						event.preventDefault()

						// A script focus shows the focus ring when the last focus came from
						// a key or when no focus came before it, as at the load of the page.
						// This focus comes from a press, so it shows no ring, as a press on
						// the height splitter does.
						widthSplitter.current?.focus({ preventScroll: true, focusVisible: false })

						resize.handleProps.onPointerDown(event)
					}}
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
								viewport && heightResize.size !== null ? { height: heightResize.size } : undefined
							}
							className={viewport ? 'h-[32rem] min-h-40' : undefined}
						>
							{viewport ? (
								// `useToast` in the instance uses a queue of the frame, so its
								// toasts show in the frame and not at the edge of the window.
								<ToastHost>
									<InstanceBox box={box} page={page} viewport>
										{children}
									</InstanceBox>
								</ToastHost>
							) : (
								<InstanceBox box={box} page={false}>
									{children}
								</InstanceBox>
							)}
						</BreakpointFrame>
						{viewport && (
							// The drag area sits across the bottom border of the area, as the
							// drag area of the width sits across the end border.
							<div
								data-slot="example-resize-height"
								onPointerDown={heightResize.handleProps.onPointerDown}
								data-dragging={heightResize.handleProps['data-dragging']}
								className="group absolute inset-x-0 -bottom-3 z-10 h-6 cursor-ns-resize touch-pan-x select-none pointer-coarse:pointer-events-none"
							>
								<Splitter
									label={intl.formatMessage(messages.resizeHeight)}
									orientation="horizontal"
									value={heightResize.covers}
									min={0}
									max={100}
									valueText={
										size ? intl.formatMessage(pixelsMessage, { pixels: size.height }) : undefined
									}
									onKeyDown={heightResize.handleProps.onKeyDown}
									{...splitterFocus}
									className={cn('absolute inset-0 m-0', sen.focus.ring)}
								/>
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
								className="flex px-4 py-2 text-sm focus-visible:-outline-offset-2 not-aria-expanded:rounded-es-[calc(var(--radius-lg)-1px)]"
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
				{/* A window splitter on the end border, over the drag area. It is the tab
				    stop, and the arrow keys resize the frame, so a keyboard reader can
				    resize it too (WCAG 2.1.1). It comes after the box, so the Tab order
				    reaches it after the content that it sizes. The pointer goes through it
				    to the drag area, which comes first, so the box can show its border as
				    active. */}
				<Splitter
					ref={widthSplitter}
					label={intl.formatMessage(messages.resizeWidth)}
					orientation="vertical"
					value={resize.covers}
					min={0}
					max={100}
					valueText={size ? intl.formatMessage(pixelsMessage, { pixels: size.width }) : undefined}
					onKeyDown={resize.handleProps.onKeyDown}
					{...splitterFocus}
					className={cn('pointer-events-none absolute inset-y-0 -end-3 m-0 w-6', sen.focus.ring)}
				/>
				{size && <FrameSize size={size} />}
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
