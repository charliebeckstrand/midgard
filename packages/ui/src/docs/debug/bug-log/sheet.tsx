import { ArrowLeft, Copy, ListX, Trash2 } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { CopyButton, useCopyButtonState } from 'ui/copy-button'
import { cn } from 'ui/core'
import { Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { List, ListItem } from 'ui/list'
import { Markdown } from 'ui/markdown'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetPanel, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { dan } from '../../../recipes/kiso/dan/index.ts'
import { noopSubscribe } from '../../../utilities/noop.ts'
import { useDebug } from '../pause.ts'
import { CAPTURE, type Report } from './log.ts'
import { markdownOf, titleOf } from './markdown.ts'

/** The key of a report in the list. */
function getKey(report: Report): string {
	return String(report.id)
}

/** One report in the list: the title and the page, then View, Copy, and Delete. */
function ReportLine({
	report,
	onView,
	onDelete,
}: {
	report: Report
	onView: () => void
	onDelete: () => void
}) {
	return (
		<ListItem>
			<Flex align="center" gap="sm">
				<div className="min-w-0 flex-1">
					<Text
						className={cn(
							'truncate font-mono text-xs',
							report.title !== CAPTURE && 'text-red-600 dark:text-red-400',
						)}
					>
						{titleOf(report)}
					</Text>
					<Text tone="muted" className="truncate text-xs">
						{report.page} · {new Date(report.at).toLocaleTimeString()}
					</Text>
				</div>
				<Button variant="bare" size="sm" aria-label="View" onClick={onView}>
					<Icon icon={<ListX />} />
				</Button>
				<CopyButton size="sm" icon={<Copy />} text={markdownOf(report)} />
				<Button variant="bare" size="sm" aria-label="Delete" onClick={onDelete}>
					<Icon icon={<Trash2 />} />
				</Button>
			</Flex>
		</ListItem>
	)
}

/** A button with a text label that copies `text`, with the copied state of `CopyButton`. */
function CopyTextButton({ label, text }: { label: string; text: string }) {
	const { copied, copy } = useCopyButtonState({ text })

	return (
		<Button size="sm" color={copied ? 'green' : undefined} onClick={() => void copy()}>
			{copied ? 'Copied' : label}
		</Button>
	)
}

/**
 * The viewer of the Bug log: the title and "Preserve", the reports, newest
 * first, then Copy all, Capture, and Clear. View shows one report in place of
 * the list, as the Markdown that Copy writes, with Copy and Delete of that
 * report in place of "Preserve" and the actions of the list. The Event log
 * records nothing while the sheet is on screen, so a capture holds the lines
 * before the open.
 */
export function BugLogSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { bugs } = useDebug(open)

	const subscribe = open ? bugs.subscribe : noopSubscribe

	const reports = useSyncExternalStore(subscribe, () => bugs.entries)

	const preserve = useSyncExternalStore(subscribe, () => bugs.preserve)

	// The id of the report on view. A report that goes out returns the sheet to the list.
	const [viewed, setViewed] = useState<number>()

	// The sheet stays mounted while it is closed, so each open starts on the list.
	const [wasOpen, setWasOpen] = useState(open)

	if (open !== wasOpen) {
		setWasOpen(open)

		if (open) setViewed(undefined)
	}

	const report = reports.find(({ id }) => id === viewed)

	const newest = reports.toReversed()

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				<Flex align="center" gap="md" className={cn(dan.space.panel.x, dan.space.panel.top)}>
					{report && (
						<Button variant="bare" aria-label="Back" onClick={() => setViewed(undefined)}>
							<Icon icon={<ArrowLeft />} />
						</Button>
					)}
					<SheetTitle className="me-auto p-0">Bugs</SheetTitle>
					{!report && (
						<CheckboxField>
							<Checkbox
								checked={preserve}
								onChange={(event) => {
									bugs.preserve = event.target.checked
								}}
							/>
							<Label>Preserve</Label>
						</CheckboxField>
					)}
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">
					{report ? (
						<Markdown headingOffset={1}>{markdownOf(report)}</Markdown>
					) : reports.length > 0 ? (
						<List
							items={newest}
							getKey={getKey}
							variant="plain"
							sortable={false}
							aria-label="Reports"
						>
							{(item) => (
								<ReportLine
									report={item}
									onView={() => setViewed(item.id)}
									onDelete={() => bugs.remove(item.id)}
								/>
							)}
						</List>
					) : (
						<Text tone="muted">No bugs</Text>
					)}
				</SheetBody>
				<SheetFooter className="justify-between">
					{report ? (
						<Flex gap="sm">
							<CopyTextButton label="Copy" text={markdownOf(report)} />
							<Button
								size="sm"
								color="red"
								onClick={() => {
									// A new report can take the id of the report that goes out.
									setViewed(undefined)

									bugs.remove(report.id)
								}}
							>
								Delete
							</Button>
						</Flex>
					) : (
						<Flex gap="sm">
							<CopyTextButton label="Copy all" text={newest.map(markdownOf).join('\n\n---\n\n')} />
							<Button size="sm" color="blue" onClick={() => bugs.capture()}>
								Capture
							</Button>
							<Button size="sm" color="amber" onClick={() => bugs.clear()}>
								Clear
							</Button>
						</Flex>
					)}
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}
