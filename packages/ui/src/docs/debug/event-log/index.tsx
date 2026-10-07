import { Bug, ScrollText } from 'lucide-react'
import { type ComponentType, type ReactElement, useState } from 'react'
import { Button } from 'ui/button'
import { cn } from 'ui/core'
import { Fieldset, Label, Legend } from 'ui/fieldset'
import { Icon } from 'ui/icon'
import { Switch, SwitchField } from 'ui/switch'
import { noop } from '../../../utilities/noop.ts'
import { useFail } from '../../kit/fail.ts'
import { useIdle } from '../../kit/idle.ts'

// The part of the Event log that the shell loads with each page: the head
// script, the header button, and the switch of the settings. The recorder and
// the sheet load only while the tool is on.

/** The `localStorage` key of the on/off setting. */
const SETTING = 'docs:event-log'

/** The attribute of the root element while the tool is on. CSS shows the header button by it. */
const ATTRIBUTE = 'data-debug'

const loadRecorder = () => import('./recorder.ts')

/** A sheet of a debug tool. */
type DebugSheet = ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void }>

/**
 * The sheet of a debug tool, which loads on demand. The button reads `current`
 * in the render, so the sheet mounts in the frame that opens it.
 */
type LazySheet = {
	/** The sheet, once its load ends. */
	current?: DebugSheet
	load: () => Promise<void>
	/** Loads the sheet while the tool is on. A load that fails does nothing. The open of the sheet shows the failure. */
	prepare: () => void
}

/** The sheet that `load` loads. */
function lazySheet(load: () => Promise<DebugSheet>): LazySheet {
	const sheet: LazySheet = {
		load: () =>
			load().then((loaded) => {
				sheet.current = loaded
			}),
		prepare: () => {
			if (isEventLogOn()) sheet.load().catch(noop)
		},
	}

	return sheet
}

const eventLogSheet = lazySheet(() => import('./sheet.tsx').then((module) => module.EventLogSheet))

const bugLogSheet = lazySheet(() =>
	import('../bug-log/sheet.tsx').then((module) => module.BugLogSheet),
)

/** Test-only: drops the loaded sheets, so the next open loads them again. @internal */
export function __resetDebugSheets(): void {
	eventLogSheet.current = undefined

	bugLogSheet.current = undefined
}

/** Whether the tool is on. The head script sets the attribute before the first paint. */
function isEventLogOn(): boolean {
	return document.documentElement.hasAttribute(ATTRIBUTE)
}

/**
 * Starts the recorder while the tool is on. The client entry waits for it
 * before it hydrates. A load that fails leaves the log off for this page load,
 * and the page hydrates. The open of the sheet shows the failure.
 */
export function startEventLog(): Promise<void> {
	if (!isEventLogOn()) return Promise.resolve()

	return loadRecorder().then(({ start }) => {
		start()
	}, noop)
}

/** Writes a route line while the tool is on. The shell calls it on each route change. */
export function recordRoute(pathname: string): void {
	if (isEventLogOn()) void loadRecorder().then(({ record }) => record('route', pathname))
}

function setEventLog(on: boolean): void {
	try {
		if (on) localStorage.setItem(SETTING, '1')
		else localStorage.removeItem(SETTING)
	} catch {}

	document.documentElement.toggleAttribute(ATTRIBUTE, on)

	void loadRecorder().then((recorder) => (on ? recorder.start() : recorder.halt()))
}

// The head script: it sets the attribute while the tool is on, and keeps the
// scroll and viewport readings until the recorder takes them.
const SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(SETTING)})!=='1')return}catch(e){return}
document.documentElement.setAttribute(${JSON.stringify(ATTRIBUTE)},'');var w=window,v=w.visualViewport,b=[],o={capture:true,passive:true};
function f(e){if(b.length<50)b.push({time:Math.round(performance.now()),kind:e.type==='scroll'?'scroll':'viewport',text:e.type+' before hydration'+(v?' visual '+Math.round(v.height)+'@'+Math.round(v.offsetTop):'')+' window '+w.innerHeight,y:Math.round(w.scrollY)})}
f({type:'head'});document.addEventListener('scroll',f,o);w.addEventListener('resize',f);if(v)v.addEventListener('resize',f);
w.__eventLog={entries:b,stop:function(){document.removeEventListener('scroll',f,o);w.removeEventListener('resize',f);if(v)v.removeEventListener('resize',f)}}})()`

/** The head script of the Event log. Render it in the `<head>`, before the first paint. */
export function EventLogScript() {
	return <script>{SCRIPT}</script>
}

/**
 * The header button of a debug tool. The prerendered page holds it, and CSS
 * shows it while the tool is on, so it paints with the header. The sheet loads
 * in idle time while the tool is on, or when the reader points at the button.
 */
function DebugButton({
	label,
	icon,
	sheet,
	dot,
}: {
	label: string
	icon: ReactElement
	sheet: LazySheet
	/** A mark on the button, which CSS shows by a state of the root element. */
	dot?: string
}) {
	// No sheet renders before the first open.
	const [open, setOpen] = useState<boolean>()

	useIdle(sheet.prepare)

	const fail = useFail()

	// The sheet opens when its module is loaded. A sheet that suspends opens
	// late, because React holds the content back for at least 300 ms. When the
	// load fails, the error boundary shows the failure.
	const show = () => {
		if (sheet.current) setOpen(true)
		else sheet.load().then(() => setOpen(true), fail)
	}

	const Sheet = sheet.current

	return (
		<span data-event-log="" className="hidden [:root[data-debug]_&]:contents">
			<Button
				variant="bare"
				aria-label={label}
				className="relative"
				onPointerEnter={sheet.prepare}
				onClick={show}
			>
				<Icon icon={icon} />
				{dot && (
					<span
						className={cn('absolute end-1 top-1 hidden size-1.5 rounded-full bg-red-500', dot)}
					/>
				)}
			</Button>
			{open !== undefined && Sheet && <Sheet open={open} onOpenChange={setOpen} />}
		</span>
	)
}

/** The header button of the Event log. */
export function EventLogButton() {
	return <DebugButton label="Event log" icon={<ScrollText />} sheet={eventLogSheet} />
}

/** The header button of the Bug log. A dot shows while the Bug log holds a report. */
export function BugLogButton() {
	return (
		<DebugButton label="Bugs" icon={<Bug />} sheet={bugLogSheet} dot="[:root[data-bugs]_&]:block" />
	)
}

/**
 * The Debug section of the settings: the switch of the Event log. The settings
 * render on the client only, so the switch reads the root element.
 */
export function EventLogSwitch() {
	const [on, setOn] = useState(isEventLogOn)

	return (
		<Fieldset>
			<Legend>Debug</Legend>
			<SwitchField>
				<Label>Event log</Label>
				<Switch
					checked={on}
					onChange={(event) => {
						setEventLog(event.target.checked)

						setOn(event.target.checked)
					}}
				/>
			</SwitchField>
		</Fieldset>
	)
}
