import { useState, useSyncExternalStore } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Label } from 'ui/fieldset'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetTitle } from 'ui/sheet'
import { type Entry, type Kind, start } from './recorder.ts'

const KINDS: readonly Kind[] = [
	'load',
	'paint',
	'route',
	'input',
	'scroll',
	'viewport',
	'call',
	'overlay',
	'error',
	'hmr',
]

/** One line of text: the time, the scroll position, the kind, and the text. */
function line({ time, kind, text, y }: Entry): string {
	return `${String(time).padStart(6)} y${String(y).padEnd(5)} ${kind.padEnd(8)} ${text}`
}

/**
 * The viewer of the Event log: the lines, newest first, a filter chip for each
 * kind, Copy (oldest first, as text), Clear, and "Preserve log". The log
 * records while the sheet is open, and skips the events in the sheet.
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

	const [hidden, setHidden] = useState<ReadonlySet<Kind>>(new Set())

	const [copied, setCopied] = useState(false)

	const shown = entries.filter((entry) => !hidden.has(entry.kind))

	const toggle = (kind: Kind) => {
		const next = new Set(hidden)

		if (!next.delete(kind)) next.add(kind)

		setHidden(next)
	}

	const copy = () => {
		navigator.clipboard.writeText(shown.map(line).join('\n')).then(
			() => setCopied(true),
			() => setCopied(false),
		)
	}

	return (
		// The sheet takes the height of the log, up to the height of the screen.
		<Sheet side="bottom" open={open} onOpenChange={onOpenChange} className="max-h-full">
			{/* The log skips the events in this element (`OWN`). It takes no box. */}
			<div data-event-log="" className="contents">
				<SheetTitle>Event log</SheetTitle>
				<SheetBody className="min-h-0 flex-1 space-y-3 overflow-auto">
					<div className="flex flex-wrap gap-1.5">
						{KINDS.map((kind) => (
							<Button
								key={kind}
								size="xs"
								variant={hidden.has(kind) ? 'outline' : 'soft'}
								aria-pressed={!hidden.has(kind)}
								onClick={() => toggle(kind)}
							>
								{kind}
							</Button>
						))}
					</div>
					<pre className="m-0 whitespace-pre-wrap font-mono text-xs">
						{shown.toReversed().map(line).join('\n')}
					</pre>
				</SheetBody>
				<SheetFooter className="flex-wrap justify-between">
					<div className="flex items-center gap-2">
						<Button size="sm" variant="soft" color={copied ? 'green' : undefined} onClick={copy}>
							{copied ? 'Copied' : 'Copy'}
						</Button>
						<Button size="sm" variant="soft" onClick={() => log.clear()}>
							Clear
						</Button>
						<CheckboxField>
							<Checkbox
								checked={preserve}
								onChange={(event) => {
									log.preserve = event.target.checked
								}}
							/>
							<Label>Preserve log</Label>
						</CheckboxField>
					</div>
					<SheetClose>
						<Button size="sm" variant="plain">
							Close
						</Button>
					</SheetClose>
				</SheetFooter>
			</div>
		</Sheet>
	)
}
