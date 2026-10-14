import { EventsScript, startEvents } from 'ui/events'
import { DOCS_SOURCES } from './sources.ts'

// The part of the events that the docs shell holds: the head scripts and the
// start of the store. The module `ui/events` holds the store, the header
// button, the sheet, the pinned panel, and the switch of the settings.

// The head script of the docs: while the events run, it keeps the scroll and
// viewport readings before hydration until the store takes them (`sources.ts`).
const SCRIPT = `(function(){try{if(localStorage.getItem('events:on')!=='1')return}catch(e){return}
var w=window,v=w.visualViewport,b=[],o={capture:true,passive:true};
function f(e){if(b.length<50)b.push({time:Math.round(performance.now()),kind:e.type==='scroll'?'scroll':'viewport',text:e.type+' before hydration'+(v?' visual '+Math.round(v.height)+'@'+Math.round(v.offsetTop):'')+' window '+w.innerHeight,y:Math.round(w.scrollY)})}
f({type:'head'});document.addEventListener('scroll',f,o);w.addEventListener('resize',f);if(v)v.addEventListener('resize',f);
w.__eventReadings={entries:b,stop:function(){document.removeEventListener('scroll',f,o);w.removeEventListener('resize',f);if(v)v.removeEventListener('resize',f)}}})()`

/** The head scripts of the events. Render them in the `<head>`, before the first paint. */
export function DebugScript() {
	return (
		<>
			<EventsScript />
			<script>{SCRIPT}</script>
		</>
	)
}

/** The options of the store of the docs: the sources of the docs, and the script calls that scroll or move the focus. */
const OPTIONS = { sources: DOCS_SOURCES, calls: true }

/**
 * Starts the store while the events run. The client entry waits for it
 * before it hydrates, so the store records from before hydration.
 */
export function startDebug(): Promise<void> {
	return startEvents(OPTIONS)
}
