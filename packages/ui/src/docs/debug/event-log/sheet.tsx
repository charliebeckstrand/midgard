import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { useCopyButtonState } from 'ui/copy-button'
import { cn } from 'ui/core'
import { Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetPanel, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { dan } from '../../../recipes/kiso/dan/index.ts'
import { type Entry, start } from './recorder.ts'

/** One line of text: the time, the scroll position, the kind, and the text. */
function line({ time, kind, text, y }: Entry): string {
	return `${String(time).padStart(6)} y${String(y).padEnd(5)} ${kind.padEnd(8)} ${text}`
}

/**
 * The viewer of the Event log: the title and "Preserve log", the lines, newest
 * first, Copy (oldest first, as text), and Clear. With no lines, it says that
 * the log is empty. The log records nothing while the sheet is on screen.
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

	const lines = entries.map(line)

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
				{/* The title row holds "Preserve log". It is one row from `sm`, and a
				    column below it. The row takes the inset of the title, as the slot
				    does. */}
				<Flex
					direction={{ initial: 'col', sm: 'row' }}
					align={{ initial: 'start', sm: 'center' }}
					justify="between"
					gap="sm"
					className={cn(dan.space.panel.x, dan.space.panel.top)}
				>
					<SheetTitle className="p-0">Event log</SheetTitle>
					<CheckboxField>
						<Checkbox
							checked={preserve}
							onChange={(event) => {
								log.preserve = event.target.checked
							}}
						/>
						<Label>Preserve log</Label>
					</CheckboxField>
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">
					{lines.length > 0 ? (
						<pre className="m-0 whitespace-pre-wrap font-mono text-xs">
							{lines.toReversed().join('\n')}
						</pre>
					) : (
						<Text tone="muted">No events</Text>
					)}
				</SheetBody>
				<SheetFooter className="justify-between">
					<Flex gap="sm">
						{/* The copied state of `CopyButton`, on a button with a text label. */}
						<Button variant="soft" color={copied ? 'green' : 'blue'} onClick={() => void copy()}>
							{copied ? 'Copied' : 'Copy'}
						</Button>
						<Button variant="soft" color="amber" onClick={() => log.clear()}>
							Clear
						</Button>
					</Flex>
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}
