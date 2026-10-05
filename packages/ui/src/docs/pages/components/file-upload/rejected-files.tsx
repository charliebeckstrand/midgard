import { useState } from 'react'
import { Description, Field, Label, Message } from 'ui/fieldset'
import { type FileRejection, FileUploadInput } from 'ui/file-upload'

const errors: Record<FileRejection['reason'], string> = {
	type: 'Choose a PNG or JPEG image.',
	size: 'Choose an image that is 1 MB or smaller.',
	count: 'Choose one image.',
}

export default function RejectedFiles() {
	const [error, setError] = useState<string>()

	return (
		<Field severity={error ? 'error' : undefined}>
			<Label>Profile photo</Label>
			<Description>A PNG or JPEG image, up to 1 MB.</Description>
			<FileUploadInput
				accept="image/png,image/jpeg"
				maxSize={1_000_000}
				onAccept={() => setError(undefined)}
				onReject={([rejection]) => setError(rejection && errors[rejection.reason])}
			/>
			{error && <Message>{error}</Message>}
		</Field>
	)
}
