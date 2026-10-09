import { Copy, ListX, Trash2 } from 'lucide-react'
import { type MouseEvent, useState, useSyncExternalStore } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Button } from 'ui/button'
import { CopyButton } from 'ui/copy-button'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { List, ListItem } from 'ui/list'
import { Markdown } from 'ui/markdown'
import { SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { noopSubscribe } from '../../../utilities/noop.ts'
import { useDebug } from '../pause.ts'
import { CopyTextButton, FlagField, SheetFrame } from '../sheet-frame.tsx'
import { CAPTURE, type Report } from './log.ts'
import { markdownOf, titleOf } from './markdown.ts'

/** The key of a report in the list. */
function getKey(report: Report): string {
	return String(report.id)
}

/**
 * One report in the list: the title, the page and the time, and the hash, then
 * View, Copy, and Delete. A press on the row outside the actions opens the
 * report, as View does.
 */
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
		<ListItem
			onClick={onView}
			className="text-start"
			suffix={
				<Flex align="center" gap="sm">
					<Button variant="bare" size="sm" aria-label="View" onClick={onView}>
						<Icon icon={<ListX />} />
					</Button>
					<CopyButton size="sm" icon={<Copy />} text={markdownOf(report)} />
					<Button variant="bare" size="sm" aria-label="Delete" onClick={onDelete}>
						<Icon icon={<Trash2 />} />
					</Button>
				</Flex>
			}
		>
			<span className="block min-w-0">
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
				<Text className="truncate font-mono text-xs text-rose-600 dark:text-rose-400">
					{report.hash}
				</Text>
			</span>
		</ListItem>
	)
}

/**
 * The viewer of the Bug log: the title and "Preserve", the reports, newest
 * first, then Capture, and Clear while the log holds a report. View, or a
 * press on a row, shows one report in place of the list, as the Markdown that
 * Copy writes. The crumbs "Bugs" and the hash of the report take the place of
 * the title, and Copy and Delete of that report take the place of "Preserve"
 * and the actions of the list. The Event log records nothing while the sheet
 * is on screen, so a capture holds the lines before the open.
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
		<SheetFrame
			open={open}
			onOpenChange={onOpenChange}
			title={
				report ? (
					// The crumbs name the report and lead back to the list. The title
					// stays for the name of the sheet.
					<>
						<SheetTitle className="sr-only p-0">Bugs</SheetTitle>
						<Breadcrumb className="me-auto min-w-0">
							<BreadcrumbList className="text-xl/8">
								<BreadcrumbItem>
									<BreadcrumbLink
										href="#"
										className="font-semibold"
										onClick={(event: MouseEvent) => {
											event.preventDefault()

											setViewed(undefined)
										}}
									>
										Bugs
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbLink current className="font-semibold">
										{report.hash}
									</BreadcrumbLink>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</>
				) : (
					<SheetTitle className="me-auto p-0">Bugs</SheetTitle>
				)
			}
			actions={
				!report && (
					<FlagField
						label="Preserve"
						checked={preserve}
						onChange={(checked) => {
							bugs.preserve = checked
						}}
					/>
				)
			}
			footer={
				report ? (
					<>
						<CopyTextButton text={markdownOf(report)} />
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
					</>
				) : (
					<>
						<Button size="sm" color="blue" onClick={() => bugs.capture()}>
							Capture
						</Button>
						{reports.length > 0 && (
							<Button size="sm" color="amber" onClick={() => bugs.clear()}>
								Clear
							</Button>
						)}
					</>
				)
			}
		>
			{report ? (
				<Markdown headingOffset={1}>{markdownOf(report)}</Markdown>
			) : reports.length > 0 ? (
				<List items={newest} getKey={getKey} variant="plain" sortable={false} aria-label="Reports">
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
		</SheetFrame>
	)
}
