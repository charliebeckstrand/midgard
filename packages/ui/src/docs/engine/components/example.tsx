'use client'

import { type ReactNode, useId, useMemo, useState } from 'react'
import { CodeBlock } from '../../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../../components/collapse'
import { Flex } from '../../../components/flex'
import { Heading } from '../../../components/heading'
import { Spacer } from '../../../components/spacer'
import { Stack } from '../../../components/stack'
import { deriveCode } from '../derive-code'
import { useRegisterExample } from './demo-nav'

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
 */
export function Example({
	title,
	prefix,
	actions,
	preview,
	footer,
	code,
	children,
}: {
	title?: ReactNode
	prefix?: ReactNode
	actions?: ReactNode
	preview?: ReactNode
	footer?: ReactNode
	/** Explicit override. When omitted, the block derives from `children`. */
	code?: string
	children: ReactNode
}) {
	const derived = useMemo(() => (code ? null : deriveCode(children)), [code, children])

	const resolvedCode = code ?? derived

	const [open, setOpen] = useState(false)

	const anchorId = useId()

	useRegisterExample(anchorId, title)

	return (
		<Stack gap="sm" id={anchorId} data-slot="example">
			{(title || actions) && (
				<Flex gap="md">
					{title && <Heading level={3}>{title}</Heading>}
					<Spacer />
					{actions}
				</Flex>
			)}
			<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
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
			</div>
		</Stack>
	)
}
