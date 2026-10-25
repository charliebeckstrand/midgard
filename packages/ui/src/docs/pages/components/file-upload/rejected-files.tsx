import { useState } from 'react'
import { Description, Field, Label, Message } from 'ui/fieldset'
import { type FileRejection, FileUploadInput } from 'ui/file-upload'

function RejectionMessage({ reason }: { reason: FileRejection['reason'] }) {
	switch (reason) {
		case 'type':
			return 'Select a PNG or JPEG image.'
		case 'size':
			return 'Select an image that is 1 MB or smaller.'
		case 'count':
			return 'Select one image.'
	}
}

export default function RejectedFiles() {
	const [reason, setReason] = useState<FileRejection['reason']>()

	return (
		<Field severity={reason ? 'error' : undefined}>
			<Label>Profile photo</Label>
			<Description>A PNG or JPEG image, up to 1 MB.</Description>
			<FileUploadInput
				accept="image/png,image/jpeg"
				maxSize={1_000_000}
				onAccept={() => setReason(undefined)}
				onReject={([rejection]) => setReason(rejection?.reason)}
			/>
			{reason && (
				<Message>
					<RejectionMessage reason={reason} />
				</Message>
			)}
		</Field>
	)
}
