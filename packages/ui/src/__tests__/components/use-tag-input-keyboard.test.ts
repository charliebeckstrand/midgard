import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTagInputKeyboard } from '../../components/tag-input/use-tag-input-keyboard'
import { makeKeyEvent } from '../helpers'

describe('useTagInputKeyboard', () => {
	it('Enter key calls addTag and clearInput on success', () => {
		const addTag = vi.fn(() => true)
		const removeTag = vi.fn()
		const clearInput = vi.fn()

		const { result } = renderHook(() =>
			useTagInputKeyboard({ inputValue: 'hello', addTag, removeTag, clearInput, tagCount: 0 }),
		)

		result.current(makeKeyEvent<HTMLInputElement>('Enter'))

		expect(addTag).toHaveBeenCalledWith('hello')
		expect(clearInput).toHaveBeenCalled()
	})

	it('Enter key does not clear input when addTag returns false', () => {
		const addTag = vi.fn(() => false)
		const clearInput = vi.fn()

		const { result } = renderHook(() =>
			useTagInputKeyboard({
				inputValue: 'dup',
				addTag,
				removeTag: vi.fn(),
				clearInput,
				tagCount: 0,
			}),
		)

		result.current(makeKeyEvent<HTMLInputElement>('Enter'))

		expect(addTag).toHaveBeenCalledWith('dup')
		expect(clearInput).not.toHaveBeenCalled()
	})

	it('comma key calls addTag and clearInput on success', () => {
		const addTag = vi.fn(() => true)
		const clearInput = vi.fn()

		const { result } = renderHook(() =>
			useTagInputKeyboard({
				inputValue: 'tag',
				addTag,
				removeTag: vi.fn(),
				clearInput,
				tagCount: 0,
			}),
		)

		result.current(makeKeyEvent<HTMLInputElement>(','))

		expect(addTag).toHaveBeenCalledWith('tag')
		expect(clearInput).toHaveBeenCalled()
	})

	it('Backspace removes last tag when input is empty', () => {
		const removeTag = vi.fn()

		const { result } = renderHook(() =>
			useTagInputKeyboard({
				inputValue: '',
				addTag: vi.fn(),
				removeTag,
				clearInput: vi.fn(),
				tagCount: 3,
			}),
		)

		result.current(makeKeyEvent<HTMLInputElement>('Backspace'))

		expect(removeTag).toHaveBeenCalledWith(2)
	})

	it('Backspace does nothing when no tags exist', () => {
		const removeTag = vi.fn()

		const { result } = renderHook(() =>
			useTagInputKeyboard({
				inputValue: '',
				addTag: vi.fn(),
				removeTag,
				clearInput: vi.fn(),
				tagCount: 0,
			}),
		)

		result.current(makeKeyEvent<HTMLInputElement>('Backspace'))

		expect(removeTag).not.toHaveBeenCalled()
	})

	it('Backspace does nothing when input has content', () => {
		const removeTag = vi.fn()

		const { result } = renderHook(() =>
			useTagInputKeyboard({
				inputValue: 'text',
				addTag: vi.fn(),
				removeTag,
				clearInput: vi.fn(),
				tagCount: 3,
			}),
		)

		result.current(makeKeyEvent<HTMLInputElement>('Backspace'))

		expect(removeTag).not.toHaveBeenCalled()
	})
})
