/**
 * What one edit and one mount of a Wysiwyg cost in a real engine.
 *
 * An edit is one transaction that inserts or deletes one character at the end
 * of the doc, which the bench dispatches under `flushSync`. Thus each sample
 * holds the work of ProseMirror, the Markdown bridge, and the React commit
 * that follows, and not the read of the DOM change that the browser makes.
 * The edits alternate an insert and a delete, so the doc keeps its size. A
 * sample of the edit groups is ten edits, because the timer of the page counts
 * in steps of 0.1 ms and a small edit costs about that.
 *
 * The rungs ladder the field: uncontrolled, controlled by a parent that holds
 * the value in state, the ChatPrompt with `wysiwyg`, and the ChatPrompt with
 * `wysiwyg`, a source of the picker, and attachments. The doc rungs give
 * the cost that grows with the size of the doc.
 */

import './render-count'
import { EditorView } from 'prosemirror-view'
import { type ReactNode, useState } from 'react'
import { flushSync } from 'react-dom'
import { ChatPrompt, type ChatPromptSource } from '../../modules/chat'
import { Wysiwyg, WysiwygToolbar } from '../../modules/wysiwyg'
import { compareBenches } from '../compare'
import { reactHost, settle, WINDOW } from './harness'
import { readRenders, resetRenders } from './render-count'

/** The view of each editable element, which the editor does not give out. */
const views = new WeakMap<HTMLElement, EditorView>()

const someProp = EditorView.prototype.someProp

/**
 * `someProp` that records the view first. The view reads its props as it is
 * made, so the creation records the view. Only the mounts use it, so the
 * samples run with no patch.
 */
const recordView = function (this: EditorView, ...args: unknown[]) {
	views.set(this.dom as HTMLElement, this)

	return Reflect.apply(someProp, this, args)
} as typeof someProp

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

/** A source of the picker, which the edits do not open. */
const SOURCES: readonly ChatPromptSource[] = [
	{ trigger: '@', target: 'dataset', label: 'Datasets', search: () => [] },
]

/** A composer with a picker and attachments, as an app gives one. */
function ChatFull() {
	const [value, setValue] = useState(SMALL)

	return (
		<ChatPrompt
			value={value}
			onValueChange={(next) => setValue(next)}
			onSubmit={() => undefined}
			sources={SOURCES}
			onAttach={() => undefined}
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

/** The edits of one sample: an even count, so the doc keeps its size. */
const EDITS = 10

/** One sample of an edit group: {@link EDITS} edits. */
function edits(field: Field) {
	for (let index = 0; index < EDITS; index++) edit(field)
}

const tag = (name: string, ui: ReactNode) => <div data-bench={name}>{ui}</div>

/** The renders of one edit, for the log. */
const NAMES = [
	'Wysiwyg',
	'WysiwygToolbar',
	'WysiwygActionButton',
	'WysiwygLinkButton',
	'IconButton',
	'ChatPrompt',
	'ChatPromptPicker',
	'Button',
]

/** Logs the renders of one edit of each field. */
function logRenders(list: readonly Field[]) {
	for (const field of list) {
		edit(field)

		resetRenders()

		edit(field)

		console.log(`wysiwyg renders · ${field.name}`, JSON.stringify(readRenders(NAMES)))
	}
}

/** Mounts each field, and records the view of its editor. */
async function mountAll(entries: readonly (readonly [string, ReactNode])[]): Promise<Field[]> {
	EditorView.prototype.someProp = recordView

	const list: Field[] = []

	for (const [name, ui] of entries) list.push(await mount(name, tag(name, ui)))

	EditorView.prototype.someProp = someProp

	return list
}

// An edit reads the selection of the page, and the browser then lays out the
// page. The layout of a large doc thus goes into each edit of each field on
// the page, so the large docs mount only when their group starts.
compareBenches(
	'wysiwyg · ten edits · small doc',
	async (bench) => {
		const fields = await mountAll([
			[
				'uncontrolled',
				<Wysiwyg key="uncontrolled" aria-label="Notes" defaultValue={SMALL}>
					<WysiwygToolbar />
				</Wysiwyg>,
			],
			['controlled', <Controlled key="controlled" initial={SMALL} />],
			['chat', <Chat key="chat" />],
			['chat-full', <ChatFull key="chat-full" />],
		])

		logRenders(fields)

		for (const field of fields) bench(field.name, () => edits(field))
	},
	WINDOW.settled,
)

compareBenches(
	'wysiwyg · ten edits · controlled, by doc size',
	async (bench) => {
		const sized = await mountAll(
			SIZES.map((size) => [`doc-${size}`, <Controlled key={size} initial={doc(size)} />] as const),
		)

		logRenders(sized)

		for (const field of sized) bench(field.name, () => edits(field))
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
