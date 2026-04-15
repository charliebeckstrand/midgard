'use client'

import { type ReactNode, useState } from 'react'
import { CodeBlock } from '../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { Flex } from '../../components/flex'
import { Heading } from '../../components/heading'
import { Stack } from '../../components/stack'
import { deriveCode } from '../derive-code'

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
	/** Explicit override. When omitted, the block is derived from `children`. */
	code?: string
	children: ReactNode
}) {
	const resolvedCode = code ?? deriveCode(children)

	const [open, setOpen] = useState(false)

	return (
		<Stack gap={2}>
			{(title || actions) && (
				<Flex justify="between" gap={2}>
					{title && <Heading level={3}>{title}</Heading>}
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
							<CollapseTrigger className="flex text-sm px-4 py-2 focus-visible:ring-inset">
								{({ open }: { open: boolean }) => (open ? 'Hide code' : 'Show code')}
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
