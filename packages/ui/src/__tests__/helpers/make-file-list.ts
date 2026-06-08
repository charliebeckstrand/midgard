/**
 * Build a `FileList` from an array of `File` objects. `DataTransfer` is absent
 * in jsdom; `extends Array<File>` satisfies the `FileList` interface (length,
 * index access, `item`, iterator).
 */
class FakeFileList extends Array<File> implements FileList {
	item(index: number): File | null {
		return this[index] ?? null
	}
}

export function makeFileList(files: File[]): FileList {
	return new FakeFileList(...files)
}
