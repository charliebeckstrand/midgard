import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

// The direction of the docs: a setting that lays out the whole site left to
// right or right to left, so a reader can check each page in a right-to-left
// app. The setting writes `dir` on the root element, which is the direction of
// the app, and each portal reads it from there.
//
// "System" is the default. It follows the preferred language of the browser
// (`navigator.language`): a language in a right-to-left script, such as
// Arabic or Hebrew, gives right to left. The two other choices override it.
//
// An override stays for the tab, in `sessionStorage`. It is a check, not a
// preference, so a new visit starts at "System".

/** The choices of the setting. */
type Direction = 'system' | 'ltr' | 'rtl'

const DIRECTIONS: { label: string; value: Direction }[] = [
	{ label: 'System', value: 'system' },
	{ label: 'Left to right', value: 'ltr' },
	{ label: 'Right to left', value: 'rtl' },
]

/** The `sessionStorage` key of an override. With no key, the setting is "System". */
const SETTING = 'docs:direction'

/** The scripts that write right to left, as ISO 15924 codes. */
const RTL_SCRIPTS = ['Adlm', 'Arab', 'Hebr', 'Mand', 'Nkoo', 'Rohg', 'Samr', 'Syrc', 'Thaa', 'Yezi']

// The head script: it resolves the setting and sets `dir` when the result is
// right to left. The prerendered page has no `dir`, so a page that loads right
// to left paints right to left at once. `resolve` below gives the same result
// after hydration.
const SCRIPT = `(function(){var c=null,d='ltr';try{c=sessionStorage.getItem(${JSON.stringify(SETTING)})}catch(e){}if(c==='rtl'||c==='ltr')d=c;else try{if(${JSON.stringify(RTL_SCRIPTS)}.indexOf(new Intl.Locale(navigator.language).maximize().script)>=0)d='rtl'}catch(e){}if(d==='rtl')document.documentElement.dir='rtl'})()`

/** The head script of the direction. Render it in the `<head>`, before the first paint. */
export function DirectionScript() {
	return <script>{SCRIPT}</script>
}

/** Reads the stored choice. Any other value, or no value, is "System". */
function readSetting(): Direction {
	let stored: string | null = null

	try {
		stored = sessionStorage.getItem(SETTING)
	} catch {}

	return stored === 'ltr' || stored === 'rtl' ? stored : 'system'
}

/** The direction of the preferred language of the browser. */
function systemDirection(): 'ltr' | 'rtl' {
	try {
		const { script } = new Intl.Locale(navigator.language).maximize()

		return script && RTL_SCRIPTS.includes(script) ? 'rtl' : 'ltr'
	} catch {
		return 'ltr'
	}
}

/** The direction that a choice gives. */
function resolve(choice: Direction): 'ltr' | 'rtl' {
	return choice === 'system' ? systemDirection() : choice
}

function setDirection(choice: Direction): void {
	try {
		if (choice === 'system') sessionStorage.removeItem(SETTING)
		else sessionStorage.setItem(SETTING, choice)
	} catch {}

	if (resolve(choice) === 'rtl') document.documentElement.dir = 'rtl'
	else document.documentElement.removeAttribute('dir')
}

function labelFor(choice: Direction): string {
	return DIRECTIONS.find((option) => option.value === choice)?.label ?? choice
}

/**
 * The picker of the direction in the settings. The settings render on the
 * client only, so the picker reads the stored choice at once.
 */
export function DirectionListbox() {
	const [choice, setChoice] = useState(readSetting)

	return (
		<Field>
			<Label>Direction</Label>
			<Listbox<Direction>
				value={choice}
				displayValue={labelFor}
				placement="bottom-start"
				onValueChange={(next) => {
					if (!next) return

					setDirection(next)

					setChoice(next)
				}}
			>
				{DIRECTIONS.map((option) => (
					<ListboxOption key={option.value} value={option.value}>
						<ListboxLabel>{option.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}
