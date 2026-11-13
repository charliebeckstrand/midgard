import { describe, expect, it } from 'vitest'
import {
	type ReviewEdit,
	type ReviewList,
	type ReviewMarker,
	toggleList,
	toggleMarker,
} from '../../components/place-form-drawer/place-review'

/** An edit from text with `[` and `]` around the selection, or one `|` for a caret. */
function edit(marked: string): ReviewEdit {
	const caret = marked.indexOf('|')

	if (caret !== -1) {
		return { value: marked.replace('|', ''), start: caret, end: caret }
	}

	const start = marked.indexOf('[')

	const end = marked.indexOf(']') - 1

	return { value: marked.replace('[', '').replace(']', ''), start, end }
}

/** The edit as text with its selection marked, as {@link edit} reads it. */
function show({ value, start, end }: ReviewEdit): string {
	if (start === end) return `${value.slice(0, start)}|${value.slice(start)}`

	return `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`
}

describe('toggleMarker', () => {
	it.for<[string, string, ReviewMarker, string]>([
		[
			'wraps the selection and keeps it on the same words',
			'It was [good] food',
			'bold',
			'It was **[good]** food',
		],
		[
			'removes the markers around the selection',
			'It was **[good]** food',
			'bold',
			'It was [good] food',
		],
		[
			'removes the markers at the ends of the selection',
			'It was [_good_] food',
			'italic',
			'It was [good] food',
		],
		[
			'leaves the spaces at the ends of the selection outside the markers',
			'It was[ good ]food',
			'italic',
			'It was _[good]_ food',
		],
		[
			'puts a pair of markers at a caret, with the caret between them',
			'Good |',
			'bold',
			'Good **|**',
		],
		[
			'grows a caret in a word to the word for italic, as Markdown reads no `_` in a word',
			'It was go|od food',
			'italic',
			'It was _go|od_ food',
		],
		[
			'puts a pair of italic markers at a caret at the end of a word',
			'It was good|',
			'italic',
			'It was good_|_',
		],
		[
			'grows a selection in a word to the word for italic',
			'It was [go]od food',
			'italic',
			'It was _[good]_ food',
		],
		[
			'removes italic from the word that holds the caret',
			'It was _go|od_ food',
			'italic',
			'It was go|od food',
		],
		[
			'keeps a caret in a word for bold, which Markdown reads in a word',
			'It was go|od food',
			'bold',
			'It was go**|**od food',
		],
	])('%s', ([, input, kind, output]) => {
		expect(show(toggleMarker(edit(input), kind))).toBe(output)
	})
})

describe('toggleList', () => {
	it.for<[string, string, ReviewList, string]>([
		[
			'makes the line of a caret an item, and keeps the caret on its text',
			'Noodles|',
			'bulleted',
			'- Noodles|',
		],
		[
			'makes each selected line an item, and numbers a numbered list from 1',
			'Intro\n[Noodles\nBun]',
			'numbered',
			'Intro\n[1. Noodles\n2. Bun]',
		],
		[
			'leaves the next line of a selection that ends after a line break',
			'[Noodles\n]Bun',
			'bulleted',
			'[- Noodles]\nBun',
		],
		[
			'makes the lines text again when each one is an item of that kind',
			'[- Noodles\n- Bun]',
			'bulleted',
			'[Noodles\nBun]',
		],
		[
			'changes a list of the other kind to this kind',
			'[- Noodles\n- Bun]',
			'numbered',
			'[1. Noodles\n2. Bun]',
		],
	])('%s', ([, input, kind, output]) => {
		expect(show(toggleList(edit(input), kind))).toBe(output)
	})
})
