import { ArrowLeft, Eye, Trash2 } from 'lucide-react'
import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
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
import { start, startBugs } from '../event-log/recorder.ts'
import type { Report } from './log.ts'
import { markdownOf } from './markdown.ts'

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
							report.title !== 'capture' && 'text-red-600 dark:text-red-400',
						)}
					>
						{report.title}
						{report.count > 1 && ` ×${report.count}`}
					</Text>
					<Text tone="muted" className="truncate text-xs">
						{report.page} · {new Date(report.at).toLocaleTimeString()}
					</Text>
				</div>
				<Button variant="bare" size="sm" aria-label="View" onClick={onView}>
					<Icon icon={<Eye />} />
				</Button>
				<CopyButton size="sm" text={markdownOf(report)} />
				<Button variant="bare" size="sm" aria-label="Delete" onClick={onDelete}>
					<Icon icon={<Trash2 />} />
				</Button>
			</Flex>
		</ListItem>
	)
}

/**
 * The viewer of the Bug log: the title and "Preserve", the reports, newest
 * first, then Copy all, Capture, and Clear. View shows one report in place of
 * the list, as the Markdown that Copy writes. The Event log records nothing
 * while the sheet is on screen, so a capture holds the lines before the open.
 */
export function BugLogSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const [log] = useState(start)

	const [bugs] = useState(startBugs)

	const subscribe = open ? bugs.subscribe : noopSubscribe

	const reports = useSyncExternalStore(subscribe, () => bugs.entries)

	const preserve = useSyncExternalStore(subscribe, () => bugs.preserve)

	// The id of the report on view. A report that goes out returns the sheet to the list.
	const [viewed, setViewed] = useState<number>()

	const report = reports.find(({ id }) => id === viewed)

	const { copied, copy } = useCopyButtonState({
		text: reports.toReversed().map(markdownOf).join('\n\n---\n\n'),
	})

	useLayoutEffect(() => {
		log.paused = open

		return () => {
			log.paused = false
		}
	}, [log, open])

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
					<CheckboxField>
						<Checkbox
							checked={preserve}
							onChange={(event) => {
								bugs.preserve = event.target.checked
							}}
						/>
						<Label>Preserve</Label>
					</CheckboxField>
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">
					{report ? (
						<Markdown headingOffset={1}>{markdownOf(report)}</Markdown>
					) : reports.length > 0 ? (
						<List
							items={reports.toReversed()}
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
					<Flex gap="sm">
						<Button size="sm" color={copied ? 'green' : undefined} onClick={() => void copy()}>
							{copied ? 'Copied' : 'Copy all'}
						</Button>
						<Button size="sm" onClick={() => bugs.capture(log.entries)}>
							Capture
						</Button>
						<Button size="sm" color="amber" onClick={() => bugs.clear()}>
							Clear
						</Button>
					</Flex>
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}
