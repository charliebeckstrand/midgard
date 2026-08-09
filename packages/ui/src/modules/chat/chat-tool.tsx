'use client'

import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { Markdown } from '../../components/markdown'
import { StatusDot, type StatusDotProps } from '../../components/status'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chat-message'
import type { ChatToolPart, ChatToolStatus } from './engine/chat-content/types'

/** How one status draws and what it is called. @internal */
type StatusLook = { status: StatusDotProps['status']; label: string; pulse: boolean }

/**
 * The look and the word per status. Colour alone conveys a status, so the dot
 * carries the word as its accessible name rather than standing mute beside a
 * name that does not say how the step ended (WCAG 1.4.1).
 *
 * @internal
 */
const STATUS = {
	running: { status: 'info', label: 'Running', pulse: true },
	done: { status: 'active', label: 'Done', pulse: false },
	failed: { status: 'error', label: 'Failed', pulse: false },
} as const satisfies Record<ChatToolStatus, StatusLook>

/** Props for {@link ChatTool}. @internal */
export type ChatToolProps = {
	/** The step to draw. */
	part: ChatToolPart
	className?: string
}

/** The step's head: how it ended, what ran, and the line saying what it did. @internal */
function ChatToolHead({ part }: { part: ChatToolPart }) {
	const { status, label, pulse } = STATUS[part.status]

	return (
		<>
			<StatusDot size="sm" status={status} pulse={pulse} label={label} />
			<span data-slot="chat-tool-name" className={cn(k.tool.name)}>
				{part.name}
			</span>
			{part.summary !== undefined && (
				<span data-slot="chat-tool-summary" className={cn(k.tool.summary)}>
					{part.summary}
				</span>
			)}
		</>
	)
}

/**
 * Draws one `tool` block: a step the assistant took, as a line naming what ran
 * and how it ended, over the detail it opens to.
 *
 * @remarks
 * A step with `detail` is a disclosure over {@link Collapse}, closed to start,
 * because a reader wants the answer first and the working only when they doubt
 * it. The panel mounts lazily and is then held, so a step nobody opens costs no
 * Markdown lex, and one closed after opening keeps what it drew.
 *
 * A step with no detail draws as a plain line. There is nothing behind it, and
 * a disclosure that opens onto nothing is a control lying about having
 * something to show.
 *
 * The step takes no colour of its own beyond the status dot's. It sits in a
 * bubble whose fill differs by speaker, and a muted foreground that clears AA
 * against the page does not clear it against the assistant's fill — the defect
 * the embed fallback shipped with. Its rule rides `currentColor` instead, so it
 * holds on every bubble.
 *
 * @internal
 */
export function ChatTool({ part, className }: ChatToolProps) {
	return (
		<div data-slot="chat-tool" data-status={part.status} className={cn(k.tool.base, className)}>
			{part.detail === undefined ? (
				<div className={cn(k.tool.head)}>
					<ChatToolHead part={part} />
				</div>
			) : (
				<Collapse mount="lazy">
					<CollapseTrigger className={cn(k.tool.head, k.tool.trigger)}>
						<ChatToolHead part={part} />
					</CollapseTrigger>
					<CollapsePanel>
						<div data-slot="chat-tool-detail" className={cn(k.tool.details)}>
							<Markdown>{part.detail}</Markdown>
						</div>
					</CollapsePanel>
				</Collapse>
			)}
		</div>
	)
}
