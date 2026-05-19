/**
 * Build a `FileList` from an array of `File` objects. JSDOM ships `File` but
 * not `DataTransfer`, so the browser-standard `new DataTransfer().items.add(f)`
 * trick is unavailable — `extends Array<File>` is the smallest polyfill that
 * satisfies the `FileList` interface (length, index access, `item`, iterator).
 */
class FakeFileList extends Array<File> implements FileList {
	item(index: number): File | null {
		return this[index] ?? null
	}
}

export function makeFileList(files: File[]): FileList {
	return new FakeFileList(...files)
}
