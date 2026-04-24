'use client'

import { Upload } from 'lucide-react'
import { useState } from 'react'
import { FileUpload } from '../../components/file-upload'
import { Icon } from '../../components/icon'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
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
		<Stack gap={6}>
			<Example title="Default">
				<AreaDemo />
			</Example>

			<Example title="Custom content">
				<CustomContentDemo />
			</Example>

			<Example title="Input variant">
				<InputDemo />
			</Example>

			<Example title="Button variant">
				<ButtonDemo />
			</Example>

			<Example title="Button variant with color">
				<FileUpload variant="button" color="blue">
					Upload images
				</FileUpload>
			</Example>

			<Example title="Disabled">
				<DisabledDemo />
			</Example>
		</Stack>
	)
}
