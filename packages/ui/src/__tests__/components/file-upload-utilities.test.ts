import { describe, expect, it } from 'vitest'
import {
	fileListToArray,
	formatFileNames,
} from '../../components/file-upload/file-upload-utilities'

class FakeFileList extends Array<File> implements FileList {
	item(index: number): File | null {
		return this[index] ?? null
	}
}

function makeFileList(files: File[]): FileList {
	return new FakeFileList(...files)
}

describe('fileListToArray', () => {
	it('returns an empty array when the input is null', () => {
		expect(fileListToArray(null)).toEqual([])
	})

	it('converts a FileList into a real array', () => {
		const a = new File(['a'], 'a.txt', { type: 'text/plain' })

		const b = new File(['b'], 'b.txt', { type: 'text/plain' })

		const result = fileListToArray(makeFileList([a, b]))

		expect(Array.isArray(result)).toBe(true)

		expect(result).toEqual([a, b])
	})

	it('returns an empty array when the FileList is empty', () => {
		expect(fileListToArray(makeFileList([]))).toEqual([])
	})
})

describe('formatFileNames', () => {
	it('returns undefined when no files are provided', () => {
		expect(formatFileNames([])).toBeUndefined()
	})

	it('returns the lone filename for a single-file selection', () => {
		const file = new File(['x'], 'report.pdf', { type: 'application/pdf' })

		expect(formatFileNames([file])).toBe('report.pdf')
	})

	it('joins multiple filenames with a comma and space', () => {
		const a = new File(['a'], 'a.txt')

		const b = new File(['b'], 'b.txt')

		const c = new File(['c'], 'c.txt')

		expect(formatFileNames([a, b, c])).toBe('a.txt, b.txt, c.txt')
	})
})
