import { useEffect, useState } from 'react'
import { FileUploadDrop } from 'ui/file-upload'
import { ProgressBar } from 'ui/progress'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'

export default function UploadProgress() {
	const [file, setFile] = useState<File>()

	const [progress, setProgress] = useState(0)

	const uploaded = progress >= 100

	useEffect(() => {
		if (!file || progress >= 100) return

		const timer = setTimeout(() => setProgress((prev) => Math.min(prev + 10, 100)), 300)

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
					<ProgressBar
						aria-label={`Upload of ${file.name}`}
						value={progress}
						color={uploaded ? 'green' : undefined}
					/>
					<Text pulse={!uploaded}>
						{uploaded ? `Uploaded ${file.name}` : `Uploading ${file.name}…`}
					</Text>
				</Stack>
			)}
		</Stack>
	)
}
