'use client'

import { type ReactNode, useMemo, useRef, useState } from 'react'
import { CodeBlock } from '../../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Stack } from '../../../components/stack'
import { cn } from '../../../core'
import { deriveCode, type SourceFacts } from '../derive-code'
import {
	ExampleResizeHandle,
	maxDefined,
	type ResizeProp,
	resolveResize,
	useExampleResize,
} from './example-resize'

/**
 * The demo showcase frame: renders its `children` in a bordered preview with a
 * collapsible "Show code" block beneath.
 *
 * @remarks
 * The block derives from the rendered subtree via {@link deriveCode}; an
 * explicit `code` overrides it, and when neither yields anything the block is
 * omitted. The optional `title`, `actions`, `prefix`, `preview`, and `footer`
 * slots frame the preview.
 *
 * The optional `width` and `minWidth` props size the frame, and `resize` makes
 * it horizontally draggable via a right-edge handle and switches its border to
 * dashed; see {@link resolveResize} for how the boolean and object forms normalize.
 */
export function Example({
	title,
	prefix,
	actions,
	preview,
	footer,
	code,
	width: initialWidth,
	minWidth,
	resize,
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
	/** The frame's width in pixels; the starting width when `resize` is on. Auto when omitted. */
	width?: number
	/**
	 * The frame's minimum width in pixels: a CSS floor the frame never shrinks
	 * below, and — when `resize` is on — the drag lower bound, composed with any
	 * `resize.min` (the larger wins). Auto when omitted.
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
	 * never authored by hand. {@link deriveCode} reads them to render props and
	 * render-prop children the runtime tree can't express.
	 *
	 * @internal
	 */
	__facts?: SourceFacts
	children: ReactNode
}) {
	const [open, setOpen] = useState(false)

	// `deriveCode` walks the whole children subtree, and a demo hands `Example` a
	// fresh tree on every render, so the old `useMemo([code, children])` re-walked
	// for every Example on the page on any control tweak — even closed ones, whose
	// block is never shown (`open` gates only the panel mount). Whether a block
	// exists is stable across control tweaks, so settle it once at mount; walk for
	// the string only while the panel is open, caching the last one so it stays
	// visible through the close animation (`AnimatePresence` keeps the panel
	// mounted while it slides shut).
	const [hasDerivedCode] = useState(() => !code && deriveCode(children, undefined, facts) != null)

	const derivedRef = useRef<string | null>(null)

	const derived = useMemo(() => {
		if (!code && open) derivedRef.current = deriveCode(children, undefined, facts)

		return derivedRef.current
	}, [code, open, children, facts])

	const resolvedCode = code ?? derived

	const showCode = Boolean(code) || hasDerivedCode

	const resolvedResize = resolveResize(resize)

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

	const { containerRef, width, resizing, handlers } = useExampleResize(boundedResize, startWidth)

	return (
		<Stack
			gap="sm"
			data-slot="example"
			// Reserve room for the handle's outer half, which straddles the frame's
			// right edge, so it isn't clipped at full width.
			className={cn(resolvedResize && 'pr-2')}
		>
			{(title || actions) && (
				<Flex
					gap="md"
					direction={{ initial: 'col', sm: 'row' }}
					align={{ initial: 'start', sm: 'center' }}
					justify={{ initial: 'start', sm: 'between' }}
				>
					{title && <Heading level={3}>{title}</Heading>}
					{actions}
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
					<div className="border-b border-zinc-200 dark:border-zinc-800 p-4">{prefix}</div>
				)}
				<div className="flex flex-col p-4 gap-4 overflow-x-auto">{children}</div>
				{preview && (
					<div className="border-t border-zinc-200 dark:border-zinc-800 p-4">{preview}</div>
				)}
				{footer && (
					<div className="border-t border-zinc-200 dark:border-zinc-800 p-4">{footer}</div>
				)}
				{showCode && (
					<Collapse animate="slide" open={open} onOpenChange={setOpen}>
						<div className="border-t border-zinc-200 dark:border-zinc-800">
							<CollapseTrigger className="flex text-sm px-4 py-2 focus-visible:-outline-offset-2">
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
						resizing={resizing}
						handlers={handlers}
					/>
				)}
			</div>
		</Stack>
	)
}
