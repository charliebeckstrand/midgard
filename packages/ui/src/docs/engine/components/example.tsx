import {
	Children,
	isValidElement,
	lazy,
	type ReactNode,
	Suspense,
	useMemo,
	useRef,
	useState,
} from 'react'
import { CodeBlock } from '../../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { Heading } from '../../../components/heading'
import { cn } from '../../../core'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import type { deriveCode as DeriveCode } from '../derive-code'
import { hasDerivableCode } from '../derive-code/probe'
import type { SourceFacts } from '../derive-code/types'
import {
	ExampleResizeHandle,
	maxDefined,
	type ResizeProp,
	resolveResize,
	useExampleResize,
} from './example-resize'

type Derive = typeof DeriveCode

/** The walk that prints a code block, once its chunk has loaded. */
let loadedDerive: Derive | undefined

let deriveLoad: Promise<Derive> | undefined

/**
 * Load the walk that prints a code block. A page needs it only when a reader
 * opens a block, so it is not in the chunk of the page. A failed load is not
 * kept, so the next call tries again.
 */
function loadDerive(): Promise<Derive> {
	deriveLoad ??= import('../derive-code').then(
		(module) => {
			loadedDerive = module.deriveCode

			return module.deriveCode
		},
		(error: unknown) => {
			deriveLoad = undefined

			throw error
		},
	)

	return deriveLoad
}

/**
 * The demo showcase frame: renders its `children` in a bordered preview with a
 * collapsible "Show code" block beneath.
 *
 * @remarks
 * The block derives from the rendered subtree via `deriveCode`; an
 * explicit `code` overrides it, and when neither yields anything the block is
 * omitted. The optional `title`, `actions`, `prefix`, `preview`, and `footer`
 * slots frame the preview.
 *
 * Each child sits in its own instance box, as on a page in a column of 24rem.
 * The box widens to fit wider content, up to the frame, and a narrow frame
 * narrows it. In the box, a child takes the width that it takes in the flow of
 * a page. A component with a width of its own, such as a button with `w-fit`,
 * keeps that width at the start. A block, such as an input or a progress bar,
 * fills the box. Each example thus shows a component at one width, with no
 * width in the demo.
 *
 * When the root of each child is phrasing content, such as a button or a
 * badge, the boxes show in a row that wraps, and each box takes the width of
 * its child. Otherwise they stack, one to a line. The `phrasing` variant of
 * the docs stylesheet holds the rule.
 *
 * A frame with a width of its own, from `width` or `resize`, is itself the
 * column. Each box then fills the frame, so a block follows the width that the
 * reader drags.
 *
 * The optional `width` and `minWidth` props size the frame. `resize` makes it
 * horizontally draggable via a right-edge handle, and switches its border to
 * dashed. The drag stops at the content's own minimum width, which the handle
 * measures from the rendered sections, so no demo guesses a floor. See
 * {@link resolveResize} for how the boolean and object forms normalize.
 *
 * `surface` is the frame of a component that is a surface of a page, such as
 * a chart, a map, or a document viewer: {@link SURFACE}. An explicit `width`,
 * `minWidth`, or `resize` overrides its part of the preset.
 *
 * `replay` adds a button to the title row that mounts the children again, so a
 * mount animation plays again.
 */
export function Example({
	title,
	prefix,
	actions,
	preview,
	footer,
	code,
	surface,
	replay,
	width: initialWidth = surface ? SURFACE.width : undefined,
	minWidth = surface ? SURFACE.minWidth : undefined,
	resize = surface ? SURFACE.resize : undefined,
	__facts: facts,
	children,
}: {
	title?: ReactNode
	prefix?: ReactNode
	actions?: ReactNode
	preview?: ReactNode
	footer?: ReactNode
	/** Explicit override. When omitted, the block derives from `children`. */
	code?: string
	/** Gives the frame the preset of a page surface ({@link SURFACE}). */
	surface?: boolean
	/** Adds a button that mounts the children again, so a mount animation plays again. */
	replay?: boolean
	/** The frame's width in pixels; the starting width when `resize` is on. Auto when omitted. */
	width?: number
	/**
	 * The frame's minimum width in pixels: a CSS floor the frame never shrinks
	 * below. When `resize` is on it is also the drag lower bound, composed with
	 * any `resize.min` (the larger wins). Auto when omitted.
	 */
	minWidth?: number
	/**
	 * Makes the frame horizontally resizable via a right-edge handle, with a
	 * dashed border. `true` uses auto bounds; an object sets pixel `min`/`max`
	 * (both auto by default) and toggles `snap` (default off).
	 */
	resize?: ResizeProp
	/**
	 * Build-time source facts injected by the docs plugin's pre-transform —
	 * never authored by hand. `deriveCode` reads them to render props and
	 * render-prop children the runtime tree can't express.
	 *
	 * @internal
	 */
	__facts?: SourceFacts
	children: ReactNode
}) {
	const [open, setOpen] = useState(false)

	// A new key on each instance box mounts the children again.
	const [run, setRun] = useState(0)

	// `deriveCode` walks the whole children subtree, and a demo hands `Example` a
	// fresh tree on every render, so the old `useMemo([code, children])` re-walked
	// for every Example on the page on any control tweak — even closed ones, whose
	// block is never shown (`open` gates only the panel mount). Whether a block
	// exists is stable across control tweaks, so settle it once at mount; walk for
	// the string only while the panel is open, caching the last one so it stays
	// visible through the close animation (`AnimatePresence` keeps the panel
	// mounted while it slides shut).
	//
	// The mount probe asks `hasDerivableCode`, which stops at the first element
	// that would import something, rather than deriving the whole block to test it
	// against `null`: a demo page mounts many Examples and none needs the string yet.
	const [hasDerivedCode] = useState(() => !code && hasDerivableCode(children))

	const derivedRef = useRef<string | null>(null)

	// The walk loads when the reader points at the trigger, focuses it, or
	// opens the block, so it is ready by the time the panel shows.
	const [derive, setDerive] = useState(() => loadedDerive)

	const prepareDerive = () => {
		if (!derive && hasDerivedCode)
			loadDerive().then(
				(loaded) => setDerive(() => loaded),
				// The block stays empty. The next point or open tries again.
				() => {},
			)
	}

	const derived = useMemo(() => {
		if (!code && open && derive) derivedRef.current = derive(children, undefined, facts)

		return derivedRef.current
	}, [code, open, derive, children, facts])

	const resolvedCode = code ?? derived

	const showCode = Boolean(code) || hasDerivedCode

	const resolvedResize = resolveResize(resize)

	const replayButton = replay && (
		<Suspense fallback={null}>
			<ReplayButton onReplay={() => setRun((n) => n + 1)} />
		</Suspense>
	)

	const trailing =
		actions && replayButton ? (
			<Flex gap="sm" align="center">
				{actions}
				{replayButton}
			</Flex>
		) : (
			(actions ?? replayButton)
		)

	// `minWidth` floors the resize range too, composing with any `resize.min`.
	const boundedResize = resolvedResize && {
		...resolvedResize,
		min: maxDefined(resolvedResize.min, minWidth),
	}

	// Start no narrower than the floor, so the width the handle reports is honest.
	const startWidth =
		initialWidth !== undefined && minWidth !== undefined
			? Math.max(initialWidth, minWidth)
			: initialWidth

	// A frame with a width of its own is the column of its children.
	const sized = initialWidth !== undefined || Boolean(resolvedResize)

	const { containerRef, width, floor, resizing, handlers } = useExampleResize(
		boundedResize,
		startWidth,
	)

	return (
		<Stack
			gap="sm"
			data-slot="example"
			// Reserve room for the handle's outer half, which straddles the frame's
			// right edge, so it isn't clipped at full width.
			className={cn(resolvedResize && 'pr-2')}
		>
			{(title || trailing) && (
				<Flex
					gap="md"
					direction={{ initial: 'col', sm: 'row' }}
					align={{ initial: 'start', sm: 'center' }}
					justify={{ initial: 'start', sm: 'between' }}
				>
					{title && <Heading level={3}>{title}</Heading>}
					{trailing}
				</Flex>
			)}
			<div
				ref={containerRef}
				data-slot="example-frame"
				// `max-width` keeps the frame within its container, so it shrinks with
				// the window instead of overflowing when the viewport narrows; `minWidth`
				// floors it.
				style={
					width !== undefined || minWidth !== undefined
						? { width, minWidth, maxWidth: '100%' }
						: undefined
				}
				className={cn(
					'relative rounded-lg border border-zinc-200 dark:border-zinc-800',
					resolvedResize && 'border-dashed',
				)}
			>
				{prefix && (
					<div
						data-example-section=""
						className="border-b border-zinc-200 dark:border-zinc-800 p-4"
					>
						{prefix}
					</div>
				)}
				<div
					data-example-section=""
					className={cn(
						'flex flex-col items-start p-4 gap-4 overflow-x-auto',
						// A row of phrasing content centers its instances on one line.
						'phrasing:flex-row phrasing:flex-wrap phrasing:items-center phrasing:*:w-max phrasing:*:min-w-0',
						// In a row with captions, each axis value fills the height of the line.
						// The captions stay at the top, and each instance centers in the room
						// below its caption, so the captions align and the instances align. A
						// caption and its instance center on one another.
						'phrasing:has-[[data-slot=axis-caption]]:items-stretch',
						'phrasing:*:*:data-[slot=axis-value]:flex phrasing:*:*:data-[slot=axis-value]:h-full phrasing:*:*:data-[slot=axis-value]:flex-col phrasing:*:*:data-[slot=axis-value]:items-center',
						'phrasing:*:*:data-[slot=axis-value]:*:last:my-auto',
					)}
				>
					{Children.toArray(children).map((child, index) => (
						<div
							key={`${run}:${isValidElement(child) ? child.key : index}`}
							data-slot="example-instance"
							className={sized ? 'w-full' : INSTANCE}
						>
							{child}
						</div>
					))}
				</div>
				{preview && (
					<div
						data-example-section=""
						className="border-t border-zinc-200 dark:border-zinc-800 p-4"
					>
						{preview}
					</div>
				)}
				{footer && (
					<div
						data-example-section=""
						className="border-t border-zinc-200 dark:border-zinc-800 p-4"
					>
						{footer}
					</div>
				)}
				{showCode && (
					<Collapse
						animate="slide"
						open={open}
						onOpenChange={(next) => {
							if (next) prepareDerive()

							setOpen(next)
						}}
					>
						<div className="border-t border-zinc-200 dark:border-zinc-800">
							<CollapseTrigger
								className="flex text-sm px-4 py-2 focus-visible:-outline-offset-2"
								onPointerEnter={prepareDerive}
								onPointerDown={prepareDerive}
								onFocus={prepareDerive}
							>
								{open ? 'Hide code' : 'Show code'}
							</CollapseTrigger>
						</div>
						<CollapsePanel>
							{resolvedCode && (
								<CodeBlock
									code={resolvedCode}
									className="rounded-t-none border-t border-zinc-200 dark:border-zinc-800"
								/>
							)}
						</CollapsePanel>
					</Collapse>
				)}
				{boundedResize && (
					<ExampleResizeHandle
						resolved={boundedResize}
						width={width}
						floor={floor}
						resizing={resizing}
						handlers={handlers}
					/>
				)}
			</div>
		</Stack>
	)
}

// Few pages replay an animation, so the button loads only where one does.
const ReplayButton = lazy(() =>
	import('./replay-button').then((module) => ({ default: module.ReplayButton })),
)

/**
 * The frame of a page surface: 720px wide, with a drag to show how the
 * surface responds, and a floor of 160px.
 */
const SURFACE = { width: 720, minWidth: 160, resize: true } as const

/**
 * The box of each child of the frame. `w-max` takes the width of the content,
 * and the minimum gives a block the room of a form column. The minimum is the
 * frame when the frame is narrower than 24rem. `max-w-full` keeps the box
 * within the frame, and long text wraps at that width. The box is a block, so
 * its child takes the width that it takes on a page.
 */
const INSTANCE = 'w-max min-w-[min(24rem,100%)] max-w-full'
