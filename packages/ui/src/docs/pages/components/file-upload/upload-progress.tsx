import { useEffect, useState } from 'react'
import { FileUploadDrop } from 'ui/file-upload'
import { ProgressBar } from 'ui/progress'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function UploadProgress() {
	const [file, setFile] = useState<File>()

	const [progress, setProgress] = useState(0)

	useEffect(() => {
		if (!file || progress >= 100) return

		const timer = setTimeout(() => setProgress((value) => Math.min(value + 10, 100)), 300)

		return () => clearTimeout(timer)
	}, [file, progress])

	return (
		<Stack gap="md">
			<FileUploadDrop
				onAccept={([next]) => {
					setFile(next)

					setProgress(0)
				}}
			/>
			{file && (
				<Stack gap="sm">
					<ProgressBar aria-label={`Upload of ${file.name}`} value={progress} />
					<Text>{progress < 100 ? `Uploading ${file.name}…` : `Uploaded ${file.name}.`}</Text>
				</Stack>
			)}
		</Stack>
	)
}
