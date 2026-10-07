import { describe, expect, it } from 'vitest'
import {
	type ReviewEdit,
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
	it('wraps the selection and keeps it on the same words', () => {
		expect(show(toggleMarker(edit('It was [good] food'), 'bold'))).toBe('It was **[good]** food')
	})

	it('removes the markers around the selection', () => {
		expect(show(toggleMarker(edit('It was **[good]** food'), 'bold'))).toBe('It was [good] food')
	})

	it('removes the markers at the ends of the selection', () => {
		expect(show(toggleMarker(edit('It was [_good_] food'), 'italic'))).toBe('It was [good] food')
	})

	it('leaves the spaces at the ends of the selection outside the markers', () => {
		expect(show(toggleMarker(edit('It was[ good ]food'), 'italic'))).toBe('It was _[good]_ food')
	})

	it('puts a pair of markers at a caret, with the caret between them', () => {
		expect(show(toggleMarker(edit('Good |'), 'bold'))).toBe('Good **|**')
	})
})

describe('toggleList', () => {
	it('makes the line of a caret an item, and keeps the caret on its text', () => {
		expect(show(toggleList(edit('Noodles|'), 'bulleted'))).toBe('- Noodles|')
	})

	it('makes each selected line an item, and numbers a numbered list from 1', () => {
		expect(show(toggleList(edit('Intro\n[Noodles\nBun]'), 'numbered'))).toBe(
			'Intro\n[1. Noodles\n2. Bun]',
		)
	})

	it('makes the lines text again when each one is an item of that kind', () => {
		expect(show(toggleList(edit('[- Noodles\n- Bun]'), 'bulleted'))).toBe('[Noodles\nBun]')
	})

	it('changes a list of the other kind to this kind', () => {
		expect(show(toggleList(edit('[- Noodles\n- Bun]'), 'numbered'))).toBe('[1. Noodles\n2. Bun]')
	})
})
