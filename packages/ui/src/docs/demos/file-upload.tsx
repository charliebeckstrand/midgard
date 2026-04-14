'use client'

import { Upload } from 'lucide-react'
import { useState } from 'react'
import { FileUpload } from '../../components/file-upload'
import { Icon } from '../../components/icon'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

function AreaDemo() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<FileUpload accept="image/*" onFiles={setFiles} />
			{files.length > 0 && (
				<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
			)}
		</Sizer>
	)
}

function CustomContentDemo() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<FileUpload accept=".pdf,.doc,.docx" onFiles={setFiles}>
				<Icon icon={<Upload />} size="lg" />
				<Text>Upload documents</Text>
				<Text variant="muted">PDF, DOC up to 10MB</Text>
			</FileUpload>
			{files.length > 0 && (
				<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
			)}
		</Sizer>
	)
}

function InputDemo() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<FileUpload variant="input" accept="image/*" onFiles={setFiles} />
			{files.length > 0 && (
				<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
			)}
		</Sizer>
	)
}

function ButtonDemo() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<FileUpload variant="button" onFiles={setFiles} />
			{files.length > 0 && (
				<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
			)}
		</Sizer>
	)
}

function DisabledDemo() {
	return (
		<Sizer>
			<FileUpload disabled />
			<FileUpload variant="input" disabled />
			<FileUpload variant="button" disabled />
		</Sizer>
	)
}

export default function FileUploadDemo() {
	return (
		<Stack gap={8}>
			<Example
				title="Area (default)"
				code={code`
					import { FileUpload } from 'ui/file-upload'

					<FileUpload accept="image/*" onFiles={setFiles} />
				`}
			>
				<AreaDemo />
			</Example>
			<Example
				title="Custom content"
				code={code`
					import { FileUpload } from 'ui/file-upload'
					import { Icon } from 'ui/icon'
					import { Text } from 'ui/text'

					<FileUpload accept=".pdf,.doc,.docx">
						<Icon icon={<FileText />} size="lg" />
						<Text>Upload documents</Text>
						<Text variant="muted">PDF, DOC up to 10MB</Text>
					</FileUpload>
				`}
			>
				<CustomContentDemo />
			</Example>
			<Example
				title="Input variant"
				code={code`
					import { FileUpload } from 'ui/file-upload'

					<FileUpload variant="input" accept="image/*" />
				`}
			>
				<InputDemo />
			</Example>
			<Example
				title="Button variant"
				code={code`
					import { FileUpload } from 'ui/file-upload'

					<FileUpload variant="button" onFiles={setFiles} />
				`}
			>
				<ButtonDemo />
			</Example>
			<Example
				title="Button variant with color"
				code={code`
					import { FileUpload } from 'ui/file-upload'

					<FileUpload variant="button" color="blue">
						Upload images
					</FileUpload>
				`}
			>
				<FileUpload variant="button" color="blue">
					Upload images
				</FileUpload>
			</Example>
			<Example
				title="Disabled"
				code={code`
					import { FileUpload } from 'ui/file-upload'

					<FileUpload disabled />
					<FileUpload variant="input" disabled />
					<FileUpload variant="button" disabled />
				`}
			>
				<DisabledDemo />
			</Example>
		</Stack>
	)
}
