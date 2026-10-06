import { ScrollText } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Fieldset, Label, Legend } from 'ui/fieldset'
import { Icon } from 'ui/icon'
import { Switch, SwitchField } from 'ui/switch'
import { useIdle } from '../../kit/idle.ts'

// The part of the Event log that the shell loads with each page: the head
// script, the header button, and the switch of the settings. The recorder and
// the sheet load only while the tool is on.

/** The `localStorage` key of the on/off setting. */
const SETTING = 'docs:event-log'

/** The attribute of the root element while the tool is on. CSS shows the header button by it. */
const ATTRIBUTE = 'data-debug'

const loadRecorder = () => import('./recorder.ts')

// The sheet module, once its load ends. The button reads it in the render, so
// the sheet mounts in the frame that opens it.
let sheet: typeof import('./sheet.tsx') | undefined

const loadSheet = () =>
	import('./sheet.tsx').then((module) => {
		sheet = module
	})

/** Whether the tool is on. The head script sets the attribute before the first paint. */
function isEventLogOn(): boolean {
	return document.documentElement.hasAttribute(ATTRIBUTE)
}

/** Loads the sheet while the tool is on. */
function prepareSheet(): void {
	if (isEventLogOn()) void loadSheet()
}

/** Starts the recorder while the tool is on. The client entry waits for it before it hydrates. */
export async function startEventLog(): Promise<void> {
	if (isEventLogOn()) (await loadRecorder()).start()
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
 * The header button of the Event log. The prerendered page holds it, and CSS
 * shows it while the tool is on, so it paints with the header. The sheet
 * loads in idle time while the tool is on, or when the reader points at the
 * button.
 */
export function EventLogButton() {
	// No sheet renders before the first open.
	const [open, setOpen] = useState<boolean>()

	useIdle(prepareSheet)

	// The sheet opens when its module is loaded. A sheet that suspends opens
	// late, because React holds the content back for at least 300 ms.
	const show = () => {
		if (sheet) setOpen(true)
		else void loadSheet().then(() => setOpen(true))
	}

	const EventLogSheet = sheet?.EventLogSheet

	return (
		<span data-event-log="" className="hidden [:root[data-debug]_&]:contents">
			<Button variant="bare" aria-label="Event log" onPointerEnter={prepareSheet} onClick={show}>
				<Icon icon={<ScrollText />} />
			</Button>
			{open !== undefined && EventLogSheet && <EventLogSheet open={open} onOpenChange={setOpen} />}
		</span>
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
