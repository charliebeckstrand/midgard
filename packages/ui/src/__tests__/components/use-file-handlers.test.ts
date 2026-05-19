import { act, renderHook } from '@testing-library/react'
import type { DragEvent } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useFileUploadHandlers } from '../../components/file-upload/use-file-upload-handlers'
import { makeChangeEvent, makeFileList } from '../helpers'

function makeFile(name = 'a.txt') {
	return new File(['hello'], name, { type: 'text/plain' })
}

function makeDragEvent(files: File[] = []): DragEvent {
	const dataTransfer: Partial<DataTransfer> = { files: makeFileList(files) }

	const partial: Partial<DragEvent> = {
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		dataTransfer: dataTransfer as DataTransfer,
	}

	return partial as DragEvent
}

describe('useFileUploadHandlers', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('starts with empty files and dragOver=false', () => {
		const { result } = renderHook(() => useFileUploadHandlers({}))

		expect(result.current.files).toEqual([])

		expect(result.current.dragOver).toBe(false)
	})

	it('openPicker clicks the input ref when not disabled', () => {
		const { result } = renderHook(() => useFileUploadHandlers({}))

		const input = document.createElement('input')

		const click = vi.spyOn(input, 'click')

		;(result.current.inputRef as { current: HTMLInputElement | null }).current = input

		act(() => {
			result.current.openPicker()
		})

		expect(click).toHaveBeenCalled()
	})

	it('openPicker is a no-op when disabled', () => {
		const { result } = renderHook(() => useFileUploadHandlers({ disabled: true }))

		const input = document.createElement('input')

		const click = vi.spyOn(input, 'click')

		;(result.current.inputRef as { current: HTMLInputElement | null }).current = input

		act(() => {
			result.current.openPicker()
		})

		expect(click).not.toHaveBeenCalled()
	})

	it('handleChange updates files and invokes onFiles with an array', () => {
		const onFiles = vi.fn()

		const { result } = renderHook(() => useFileUploadHandlers({ onFiles }))

		const file = makeFile()

		const event = makeChangeEvent<HTMLInputElement>({
			target: { files: makeFileList([file]) } as HTMLInputElement,
		})

		act(() => {
			result.current.handleChange(event)
		})

		expect(result.current.files).toEqual([file])

		expect(onFiles).toHaveBeenCalledWith([file])
	})

	it('handleChange is a no-op when target.files is null', () => {
		const onFiles = vi.fn()

		const { result } = renderHook(() => useFileUploadHandlers({ onFiles }))

		const event = makeChangeEvent<HTMLInputElement>({
			target: { files: null } as HTMLInputElement,
		})

		act(() => {
			result.current.handleChange(event)
		})

		expect(onFiles).not.toHaveBeenCalled()
	})

	it('handleDragEnter sets dragOver and prevents default', () => {
		const { result } = renderHook(() => useFileUploadHandlers({}))

		const event = makeDragEvent()

		act(() => {
			result.current.handleDragEnter(event)
		})

		expect(event.preventDefault).toHaveBeenCalled()

		expect(event.stopPropagation).toHaveBeenCalled()

		expect(result.current.dragOver).toBe(true)
	})

	it('handleDragOver only prevents default and does not toggle dragOver', () => {
		const { result } = renderHook(() => useFileUploadHandlers({}))

		const event = makeDragEvent()

		act(() => {
			result.current.handleDragOver(event)
		})

		expect(event.preventDefault).toHaveBeenCalled()

		expect(event.stopPropagation).toHaveBeenCalled()

		expect(result.current.dragOver).toBe(false)
	})

	it('handleDragLeave clears dragOver after a single enter', () => {
		const { result } = renderHook(() => useFileUploadHandlers({}))

		act(() => {
			result.current.handleDragEnter(makeDragEvent())
		})

		act(() => {
			result.current.handleDragLeave(makeDragEvent())
		})

		expect(result.current.dragOver).toBe(false)
	})

	it('keeps dragOver true while a child boundary fires bubbled enter/leave pairs', () => {
		const { result } = renderHook(() => useFileUploadHandlers({}))

		// Cursor enters dropzone, then crosses into a child: dragenter on the
		// child bubbles before dragleave on the parent. dragOver must stay true.
		act(() => {
			result.current.handleDragEnter(makeDragEvent())
		})

		act(() => {
			result.current.handleDragEnter(makeDragEvent())
		})

		act(() => {
			result.current.handleDragLeave(makeDragEvent())
		})

		expect(result.current.dragOver).toBe(true)

		act(() => {
			result.current.handleDragLeave(makeDragEvent())
		})

		expect(result.current.dragOver).toBe(false)
	})

	it('handleDrop clears dragOver and passes files to onFiles', () => {
		const onFiles = vi.fn()

		const { result } = renderHook(() => useFileUploadHandlers({ onFiles }))

		const file = makeFile('drop.txt')

		act(() => {
			result.current.handleDragEnter(makeDragEvent())
		})

		act(() => {
			result.current.handleDrop(makeDragEvent([file]))
		})

		expect(result.current.dragOver).toBe(false)

		expect(onFiles).toHaveBeenCalledWith([file])
	})
})
