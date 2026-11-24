/**
 * What one edit and one mount of a Wysiwyg cost in a real engine.
 *
 * An edit is one transaction that inserts or deletes one character at the end
 * of the doc, which the bench dispatches under `flushSync`. Thus each sample
 * holds the work of ProseMirror, the Markdown bridge, and the React commit
 * that follows, and not the read of the DOM change that the browser makes.
 * The samples alternate an insert and a delete, so the doc keeps its size.
 *
 * The rungs ladder the field: uncontrolled, controlled by a parent that holds
 * the value in state, and the ChatPrompt with `wysiwyg`. The doc rungs give
 * the cost that grows with the size of the doc.
 */

import './render-count'
import { EditorView } from 'prosemirror-view'
import { type ReactNode, useState } from 'react'
import { flushSync } from 'react-dom'
import { ChatPrompt } from '../../modules/chat'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { compareBenches } from '../compare'
import { reactHost, settle, WINDOW } from './harness'
import { readRenders, resetRenders } from './render-count'

/** The view of each editable element, which the editor does not give out. */
const views = new WeakMap<HTMLElement, EditorView>()

const setProps = EditorView.prototype.setProps

// The field gives its editor new settings at each commit, so the first commit
// after the load records the view.
EditorView.prototype.setProps = function (this: EditorView, props) {
	views.set(this.dom as HTMLElement, this)

	setProps.call(this, props)
}

/** A block of Markdown with each construct that the field formats. */
const BLOCK = [
	'A paragraph with **bold**, *italic*, `code`, ~~strike~~, and a [link](https://example.com) in it, then more plain prose to fill the line.',
	'- A bullet with **bold**',
	'- A second bullet',
	'1. An ordered item',
	'> A quote with *italic* text.',
	'```\nconst value = 1\n```',
].join('\n\n')

/** A doc of about `size` characters. */
function doc(size: number): string {
	const parts: string[] = []

	for (let length = 0; length < size; length += BLOCK.length + 2) parts.push(BLOCK)

	return parts.join('\n\n')
}

const SMALL = 'Hello **world**'

const SIZES = [2_000, 20_000, 100_000] as const

function Controlled({ initial, toolbar = true }: { initial: string; toolbar?: boolean }) {
	const [value, setValue] = useState(initial)

	return (
		<Wysiwyg aria-label="Notes" value={value} onValueChange={setValue}>
			{toolbar && <WysiwygToolbar />}
		</Wysiwyg>
	)
}

function Chat() {
	const [value, setValue] = useState(SMALL)

	return (
		<ChatPrompt
			value={value}
			onValueChange={(next) => setValue(next)}
			onSubmit={() => undefined}
			wysiwyg
		/>
	)
}

/** A mounted field and its view. */
type Field = { name: string; view: EditorView; insert: boolean }

/** Mounts `ui` and waits for its editor. */
async function mount(name: string, ui: ReactNode): Promise<Field> {
	const root = reactHost()

	root.render(ui)

	for (let index = 0; index < 400; index++) {
		const dom = document.querySelector<HTMLElement>(`[data-bench="${name}"] .ProseMirror`)

		const view = dom && views.get(dom)

		if (view) return { name, view, insert: true }

		await settle(1)
	}

	throw new Error(`The editor of "${name}" did not load.`)
}

/** One edit: an insert at the end of the doc, or the delete of that insert. */
function edit(field: Field) {
	const { view } = field

	const end = view.state.doc.content.size - 1

	flushSync(() => {
		view.dispatch(
			field.insert ? view.state.tr.insertText('a', end) : view.state.tr.delete(end - 1, end),
		)
	})

	field.insert = !field.insert
}

const tag = (name: string, ui: ReactNode) => <div data-bench={name}>{ui}</div>

const fields: Field[] = [
	await mount(
		'uncontrolled',
		tag(
			'uncontrolled',
			<Wysiwyg aria-label="Notes" defaultValue={SMALL}>
				<WysiwygToolbar />
			</Wysiwyg>,
		),
	),
	await mount('controlled', tag('controlled', <Controlled initial={SMALL} />)),
	await mount('chat', tag('chat', <Chat />)),
]

const sized: Field[] = []

for (const size of SIZES) {
	const name = `doc-${size}`

	sized.push(await mount(name, tag(name, <Controlled initial={doc(size)} />)))
}

/** The renders of one edit, for the log. */
const NAMES = [
	'Wysiwyg',
	'WysiwygToolbar',
	'WysiwygActionButton',
	'WysiwygLinkButton',
	'ButtonIconTooltip',
	'ChatPrompt',
]

for (const field of [...fields, ...sized]) {
	edit(field)

	resetRenders()

	edit(field)

	console.log(`wysiwyg renders · ${field.name}`, JSON.stringify(readRenders(NAMES)))
}

compareBenches(
	'wysiwyg · one edit · small doc',
	(bench) => {
		for (const field of fields) bench(field.name, () => edit(field))
	},
	WINDOW.settled,
)

compareBenches(
	'wysiwyg · one edit · controlled, by doc size',
	(bench) => {
		for (const field of sized) bench(field.name, () => edit(field))
	},
	WINDOW.settled,
)

const mountRoot = reactHost()

compareBenches(
	'wysiwyg · mount and unmount, editor loaded',
	(bench) => {
		for (const size of [0, ...SIZES]) {
			const value = size === 0 ? SMALL : doc(size)

			bench(size === 0 ? 'small' : `doc-${size}`, () => {
				mountRoot.render(
					<Wysiwyg aria-label="Notes" defaultValue={value}>
						<WysiwygToolbar />
					</Wysiwyg>,
				)

				mountRoot.render(null)
			})
		}
	},
	WINDOW.settled,
)
