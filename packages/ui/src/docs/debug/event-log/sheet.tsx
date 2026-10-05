import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetPanel, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { useCopyButtonState } from '../../../components/copy-button/use-copy-button-state.ts'
import { type Entry, KINDS, type Kind, start } from './recorder.ts'

/** One line of text: the time, the scroll position, the kind, and the text. */
function line({ time, kind, text, y }: Entry): string {
	return `${String(time).padStart(6)} y${String(y).padEnd(5)} ${kind.padEnd(8)} ${text}`
}

/**
 * The viewer of the Event log: a type filter and "Preserve log", the lines,
 * newest first, Copy (oldest first, as text), and Clear. With no selected
 * type, the sheet shows each type. With no lines, it says that the log is
 * empty, or that the filter hides each entry. The log records nothing while
 * the sheet is on screen.
 */
export function EventLogSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const [log] = useState(start)

	const entries = useSyncExternalStore(log.subscribe, () => log.entries)

	const preserve = useSyncExternalStore(log.subscribe, () => log.preserve)

	const [kinds, setKinds] = useState<Kind[]>([])

	const lines = entries
		.filter((entry) => kinds.length === 0 || kinds.includes(entry.kind))
		.map(line)

	const { copied, copy } = useCopyButtonState({ text: lines.join('\n') })

	// A layout effect runs before the effect of the overlay that reports the
	// open, so the log does not record the open of this sheet.
	useLayoutEffect(() => {
		log.paused = open
	}, [log, open])

	return (
		// The sheet takes the height of the log, up to the height of the screen.
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				<SheetTitle>Event log</SheetTitle>
				<SheetBody className="min-h-0 flex-1 space-y-3 overflow-auto">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Listbox<Kind>
							multiple
							aria-label="Types"
							placeholder="All types"
							value={kinds}
							onValueChange={setKinds}
							displayValue={(kind) => kind}
						>
							{KINDS.map((kind) => (
								<ListboxOption key={kind} value={kind}>
									<ListboxLabel>{kind}</ListboxLabel>
								</ListboxOption>
							))}
						</Listbox>
						<CheckboxField className="shrink-0">
							<Checkbox
								checked={preserve}
								onChange={(event) => {
									log.preserve = event.target.checked
								}}
							/>
							<Label>Preserve log</Label>
						</CheckboxField>
					</div>
					{lines.length > 0 ? (
						<pre className="m-0 whitespace-pre-wrap font-mono text-xs">
							{lines.toReversed().join('\n')}
						</pre>
					) : (
						<Text tone="muted">
							{entries.length > 0 ? 'No events match your filters' : 'No events'}
						</Text>
					)}
				</SheetBody>
				<SheetFooter className="justify-between">
					<Flex gap="sm">
						{/* The copied state of `CopyButton`, on a button with a text label. */}
						<Button variant="soft" color={copied ? 'green' : undefined} onClick={() => void copy()}>
							{copied ? 'Copied' : 'Copy'}
						</Button>
						<Button variant="soft" onClick={() => log.clear()}>
							Clear
						</Button>
					</Flex>
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}
