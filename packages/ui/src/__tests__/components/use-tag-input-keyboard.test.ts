import { renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useTagInputKeyboard } from '../../components/tag-input/use-tag-input-keyboard'
import { makeKeyEvent } from '../helpers'

/**
 * The hook takes ONE `commit` rather than an `addTag`/`clearInput` pair, so what is left in the draft
 * after a commit is the component's business and not a decision each key path makes for itself.
 * Splitting it across handlers is what let a paste commit nothing while Enter worked.
 */
function setup(inputValue: string, tagCount: number) {
	const commit = vi.fn()

	const removeTag = vi.fn()

	const { result } = renderHook(() =>
		useTagInputKeyboard({ inputValue, commit, removeTag, tagCount }),
	)

	return { press: result.current, commit, removeTag }
}

describe('useTagInputKeyboard', () => {
	it.each([
		['Enter', 'Enter'],
		['comma', ','],
	])('%s commits the draft', (_name, key) => {
		const { press, commit } = setup('hello', 0)

		press(makeKeyEvent<HTMLInputElement>(key))

		expect(commit).toHaveBeenCalledWith('hello')
	})

	it('Enter on a draft with a token prevents the default and commits', () => {
		const { press, commit } = setup('a', 0)

		const event = makeKeyEvent<HTMLInputElement>('Enter')

		press(event)

		expect(event.defaultPrevented).toBe(true)

		expect(commit).toHaveBeenCalledWith('a')
	})

	// An empty draft has nothing to commit, so Enter keeps its native default: it submits the form.
	it.each([
		['empty', ''],
		['whitespace-only', '   '],
	])('Enter on an %s draft keeps the default so the form submits', (_name, inputValue) => {
		const { press, commit } = setup(inputValue, 0)

		const event = makeKeyEvent<HTMLInputElement>('Enter')

		press(event)

		expect(event.defaultPrevented).toBe(false)

		expect(commit).not.toHaveBeenCalled()
	})

	it('Backspace removes last tag when input is empty', () => {
		const { press, removeTag } = setup('', 3)

		press(makeKeyEvent<HTMLInputElement>('Backspace'))

		expect(removeTag).toHaveBeenCalledWith(2)
	})

	it.each([
		['no tags exist', '', 0],
		['input has content', 'text', 3],
	])('Backspace does nothing when %s', (_name, inputValue, tagCount) => {
		const { press, removeTag } = setup(inputValue, tagCount)

		press(makeKeyEvent<HTMLInputElement>('Backspace'))

		expect(removeTag).not.toHaveBeenCalled()
	})

	it('ignores Enter mid-IME-composition so a candidate selection commits no tag', () => {
		const { press, commit } = setup('draft', 0)

		press(
			makeKeyEvent<HTMLInputElement>('Enter', {
				nativeEvent: { isComposing: true } as KeyboardEvent['nativeEvent'],
			}),
		)

		expect(commit).not.toHaveBeenCalled()
	})

	it('ignores Backspace mid-IME-composition so a candidate edit deletes no committed tag', () => {
		const { press, removeTag } = setup('', 2)

		press(
			makeKeyEvent<HTMLInputElement>('Backspace', {
				nativeEvent: { isComposing: true } as KeyboardEvent['nativeEvent'],
			}),
		)

		expect(removeTag).not.toHaveBeenCalled()
	})
})
