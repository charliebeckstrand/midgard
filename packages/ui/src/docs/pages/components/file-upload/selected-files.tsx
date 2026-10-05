import { useState } from 'react'
import { FileUploadButton, formatFileNames } from 'ui/file-upload'
import { Text } from 'ui/text'

export default function SelectedFiles() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<>
			<FileUploadButton multiple onAccept={setFiles}>
				Attach files
			</FileUploadButton>
			<Text>Value: {formatFileNames(files) ?? 'Empty'}</Text>
		</>
	)
}
