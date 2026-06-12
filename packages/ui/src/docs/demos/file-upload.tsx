import { Upload } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { FileUpload } from '../../components/file-upload'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

function Sizer({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={`sm:max-w-sm ${className}`}>{children}</div>
}

function AreaExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<Stack>
				<FileUpload accept="image/*" onFiles={setFiles} />
				{files.length > 0 && (
					<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
				)}
			</Stack>
		</Sizer>
	)
}

function CustomContentExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<Stack>
				<FileUpload accept=".pdf,.doc,.docx" onFiles={setFiles}>
					<Icon icon={<Upload />} size="lg" />
					<Text>Upload documents</Text>
					<Text variant="muted">PDF, DOC up to 10MB</Text>
				</FileUpload>
				{files.length > 0 && (
					<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
				)}
			</Stack>
		</Sizer>
	)
}

function InputExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<Stack>
				<FileUpload variant="input" accept="image/*" onFiles={setFiles} />
				{files.length > 0 && (
					<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
				)}
			</Stack>
		</Sizer>
	)
}

function ButtonExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<Stack>
				<FileUpload variant="button" onFiles={setFiles} />
				{files.length > 0 && (
					<Text variant="muted">Selected: {files.map((f) => f.name).join(', ')}</Text>
				)}
			</Stack>
		</Sizer>
	)
}

function DisabledExample() {
	return (
		<Sizer className="flex flex-col gap-4">
			<FileUpload disabled />
			<FileUpload variant="input" disabled />
			<FileUpload variant="button" disabled />
		</Sizer>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<AreaExample />
			</Example>

			<Example title="Custom content">
				<CustomContentExample />
			</Example>

			<Example title="Input variant">
				<InputExample />
			</Example>

			<Example title="Button variant">
				<ButtonExample />
			</Example>

			<Example title="Disabled">
				<DisabledExample />
			</Example>
		</>
	)
}
