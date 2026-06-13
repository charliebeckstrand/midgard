import { describe, expect, it } from 'vitest'
import {
	fileListToArray,
	formatFileNames,
	partitionFiles,
} from '../../components/file-upload/file-upload-utilities'
import { makeFileList } from '../helpers'

// File.size is the byte length of its parts; a string of length n yields size n.
const fileOfSize = (name: string, size: number) => new File(['x'.repeat(size)], name)

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

describe('partitionFiles', () => {
	it('accepts everything when no constraints are set', () => {
		const files = [fileOfSize('a.txt', 10), fileOfSize('b.txt', 9_001)]

		const { accepted, rejected } = partitionFiles(files, {})

		expect(accepted).toEqual(files)

		expect(rejected).toEqual([])
	})

	it('rejects files over maxSize with reason "size", keeping the rest', () => {
		const small = fileOfSize('small.txt', 50)

		const big = fileOfSize('big.txt', 200)

		const { accepted, rejected } = partitionFiles([small, big], { maxSize: 100 })

		expect(accepted).toEqual([small])

		expect(rejected).toEqual([{ file: big, reason: 'size' }])
	})

	it('treats a file exactly at maxSize as accepted', () => {
		const exact = fileOfSize('exact.txt', 100)

		const { accepted, rejected } = partitionFiles([exact], { maxSize: 100 })

		expect(accepted).toEqual([exact])

		expect(rejected).toEqual([])
	})

	it('caps at maxCount and rejects the overflow with reason "count" in order', () => {
		const a = fileOfSize('a.txt', 1)

		const b = fileOfSize('b.txt', 1)

		const c = fileOfSize('c.txt', 1)

		const { accepted, rejected } = partitionFiles([a, b, c], { maxCount: 2 })

		expect(accepted).toEqual([a, b])

		expect(rejected).toEqual([{ file: c, reason: 'count' }])
	})

	it('applies maxCount to the survivors of maxSize, not the raw selection', () => {
		const big = fileOfSize('big.txt', 500)

		const a = fileOfSize('a.txt', 10)

		const b = fileOfSize('b.txt', 10)

		// big is dropped for size first, so a and b both fit under maxCount: 2.
		const { accepted, rejected } = partitionFiles([big, a, b], { maxSize: 100, maxCount: 2 })

		expect(accepted).toEqual([a, b])

		expect(rejected).toEqual([{ file: big, reason: 'size' }])
	})
})
