'use client'

import { type ReactNode, useId, useMemo, useState } from 'react'
import { CodeBlock } from '../../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Stack } from '../../../components/stack'
import { cn } from '../../../core'
import { deriveCode } from '../derive-code'
import { replaceHash } from '../router'
import { slugify } from '../routes'
import { jumpTo, useRegisterExample } from './demo-nav'
import {
	ExampleResizeHandle,
	maxDefined,
	type ResizeProp,
	resolveResize,
	useExampleResize,
} from './example-resize'

/**
 * Anchor link wrapping a string example title: navigating sets the example
 * hash (deep-linkable, copyable from the address bar) and scrolls the frame
 * under the sticky header. The `#` affordance surfaces on hover and focus.
 *
 * @internal
 */
function ExampleAnchor({ slug, children }: { slug: string; children: ReactNode }) {
	return (
		<a
			href={`#${slug}`}
			className="group/anchor text-current no-underline"
			onClick={(event) => {
				// Modified clicks keep the browser default (copy link, new tab).
				if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

				// The default hash jump ignores the sticky header; replaceState plus
				// jumpTo lands the frame beneath it without a history entry.
				event.preventDefault()

				replaceHash(slug)

				jumpTo(slug)
			}}
		>
			{children}
			<span
				aria-hidden="true"
				className="ml-2 select-none opacity-0 transition-opacity group-hover/anchor:opacity-60 group-focus-visible/anchor:opacity-60"
			>
				#
			</span>
		</a>
	)
}

/**
 * The demo showcase frame: renders its `children` in a bordered preview with a
 * collapsible "Show code" block beneath.
 *
 * @remarks
 * The block derives from the rendered subtree via {@link deriveCode}; an
 * explicit `code` overrides it, and when neither yields anything the block is
 * omitted. The optional `title`, `actions`, `prefix`, `preview`, and `footer`
 * slots frame the preview. A titled example registers itself with the page's
 * jump nav ({@link DemoNav}) and anchors the scroll target it jumps to.
 *
 * A string title also derives the frame's stable anchor slug (`'Server
 * grouping'` → `#server-grouping`) — the URL-hash deep link the title's hover
 * anchor and the jump nav write; `id` overrides the derivation. Titles must be
 * unique within a page for their anchors to be.
 *
 * The optional `width` and `minWidth` props size the frame, and `resize` makes
 * it horizontally draggable via a right-edge handle and switches its border to
 * dashed; see {@link resolveResize} for how the boolean and object forms normalize.
 */
export function Example({
	id,
	title,
	prefix,
	actions,
	preview,
	footer,
	code,
	width: initialWidth,
	minWidth,
	resize,
	children,
}: {
	/** Explicit anchor slug; overrides the one a string `title` derives. */
	id?: string
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
	children: ReactNode
}) {
	const derived = useMemo(() => (code ? null : deriveCode(children)), [code, children])

	const resolvedCode = code ?? derived

	const [open, setOpen] = useState(false)

	// Stable, human-readable anchor: an explicit id, else the slug of a string
	// title. The useId fallback keeps untitled frames uniquely addressable for
	// the nav registry without pretending to be a durable deep link.
	const autoId = useId()

	const anchorId = id ?? (typeof title === 'string' ? slugify(title) : undefined) ?? autoId

	useRegisterExample(anchorId, title)

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
			id={anchorId}
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
					{title && (
						<Heading level={3}>
							{typeof title === 'string' ? (
								<ExampleAnchor slug={anchorId}>{title}</ExampleAnchor>
							) : (
								title
							)}
						</Heading>
					)}
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
				<div className="overflow-x-auto p-4 space-y-4">{children}</div>
				{preview && (
					<div className="border-t border-zinc-200 dark:border-zinc-800 p-4">{preview}</div>
				)}
				{footer && (
					<div className="border-t border-zinc-200 dark:border-zinc-800 p-4">{footer}</div>
				)}
				{resolvedCode && (
					<Collapse animate="slide" open={open} onOpenChange={setOpen}>
						<div className="border-t border-zinc-200 dark:border-zinc-800">
							<CollapseTrigger className="flex text-sm px-4 py-2 focus-visible:-outline-offset-2">
								{open ? 'Hide code' : 'Show code'}
							</CollapseTrigger>
						</div>
						<CollapsePanel>
							<CodeBlock
								code={resolvedCode}
								className="rounded-t-none border-t border-zinc-200 dark:border-zinc-800"
							/>
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
