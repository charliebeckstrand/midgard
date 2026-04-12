export function fileListToArray(fileList: FileList | null): File[] {
	if (!fileList) return []

	return Array.from(fileList)
}

export function formatFileNames(files: File[]): string | undefined {
	if (files.length === 0) return undefined

	return files.map((f) => f.name).join(', ')
}
