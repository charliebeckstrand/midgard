'use client'

import { type ReactNode, useState } from 'react'
import { CodeBlock } from '../../components/code'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { Heading } from '../../components/heading'
import { deriveCode } from '../derive-code'

export function Example({
	title,
	actions,
	preview,
	footer,
	code,
	children,
}: {
	title?: ReactNode
	actions?: ReactNode
	preview?: ReactNode
	footer?: ReactNode
	/** Explicit override. When omitted, the block is derived from `children`. */
	code?: string
	children: ReactNode
}) {
	const [resolvedCode, setResolvedCode] = useState<string | null>(code ?? null)

	function resolveCode() {
		if (resolvedCode != null) return

		deriveCode(children).then((result) => {
			setResolvedCode(result)
		})
	}

	return (
		<div className="space-y-2">
			{(title || actions) && (
				<div className="flex items-center justify-between gap-2">
					{title && <Heading level={3}>{title}</Heading>}
					{actions}
				</div>
			)}
			<div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
				<div className="overflow-x-auto p-4 space-y-4">{children}</div>
				{preview && (
					<div className="border-t border-zinc-200 dark:border-zinc-800 p-4">{preview}</div>
				)}
				{footer && (
					<div className="border-t border-zinc-200 dark:border-zinc-800 p-4">{footer}</div>
				)}
				<Collapse animate="slide">
					<div className="border-t border-zinc-200 dark:border-zinc-800">
						<CollapseTrigger
							className="flex text-sm px-4 py-2 focus-visible:ring-inset"
							onClick={resolveCode}
						>
							{({ open }: { open: boolean }) => (open ? 'Hide code' : 'Show code')}
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
			</div>
		</div>
	)
}
