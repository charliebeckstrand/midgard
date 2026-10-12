import { useState } from 'react'
import { Description, Label } from 'ui/fieldset'
import { Switch, SwitchField } from 'ui/switch'

// The direction of the docs: a setting that lays out the whole site right to
// left, so a reader can check each page in a right-to-left app. The setting
// writes `dir` on the root element, which is the direction of the app, and
// each portal reads it from there.
//
// The setting stays for the tab, in `sessionStorage`. It is a check, not a
// preference, so a new visit starts left to right.

/** The `sessionStorage` key of the setting. */
const SETTING = 'docs:rtl'

/** Whether the site lays out right to left. The head script sets `dir` before the first paint. */
function isRtl(): boolean {
	return document.documentElement.dir === 'rtl'
}

function setRtl(on: boolean): void {
	try {
		if (on) sessionStorage.setItem(SETTING, '1')
		else sessionStorage.removeItem(SETTING)
	} catch {}

	if (on) document.documentElement.dir = 'rtl'
	else document.documentElement.removeAttribute('dir')
}

// The head script: it sets `dir` while the setting is on. The prerendered
// page has no `dir`, so a page that loads right to left paints right to left
// at once.
const SCRIPT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(SETTING)})==='1')document.documentElement.dir='rtl'}catch(e){}})()`

/** The head script of the direction. Render it in the `<head>`, before the first paint. */
export function DirectionScript() {
	return <script>{SCRIPT}</script>
}

/**
 * The switch of the direction in the settings. The settings render on the
 * client only, so the switch reads the root element.
 */
export function DirectionSwitch() {
	const [on, setOn] = useState(isRtl)

	return (
		<SwitchField>
			<Label>Right to left</Label>
			<Description>Lays out the site right to left, as in Arabic or Hebrew.</Description>
			<Switch
				checked={on}
				onChange={(event) => {
					setRtl(event.target.checked)

					setOn(event.target.checked)
				}}
			/>
		</SwitchField>
	)
}
