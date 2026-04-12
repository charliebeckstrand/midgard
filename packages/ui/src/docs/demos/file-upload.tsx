'use client'

import { Upload } from 'lucide-react'
import { useState } from 'react'
import { FileUpload } from '../../components/file-upload'
import { Icon } from '../../components/icon'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

function AreaDemo() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<div className="space-y-2">
			<FileUpload accept="image/*" onFiles={setFiles} />
			{files.length > 0 && (
				<Text size="sm" muted>
					Selected: {files.map((f) => f.name).join(', ')}
				</Text>
			)}
		</div>
	)
}

function InputDemo() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<div className="space-y-2">
			<FileUpload variant="input" accept="image/*" onFiles={setFiles} />
			{files.length > 0 && (
				<Text size="sm" muted>
					Selected: {files.map((f) => f.name).join(', ')}
				</Text>
			)}
		</div>
	)
}

function ButtonDemo() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<div className="space-y-2">
			<FileUpload variant="button" onFiles={setFiles} />
			{files.length > 0 && (
				<Text size="sm" muted>
					Selected: {files.map((f) => f.name).join(', ')}
				</Text>
			)}
		</div>
	)
}

export default function FileUploadDemo() {
	return (
		<div className="space-y-8">
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
				title="Sizes"
				code={code`
					import { FileUpload } from 'ui/file-upload'

					<FileUpload size="sm" />
					<FileUpload size="md" />
					<FileUpload size="lg" />
				`}
			>
				<div className="space-y-4">
					<FileUpload size="sm" />
					<FileUpload size="md" />
					<FileUpload size="lg" />
				</div>
			</Example>
			<Example
				title="Custom content"
				code={code`
					import { FileUpload } from 'ui/file-upload'
					import { Icon } from 'ui/icon'
					import { Text } from 'ui/text'

					<FileUpload accept=".pdf,.doc,.docx">
						<Icon icon={<FileText />} size="lg" />
						<Text size="sm" weight="medium">Upload documents</Text>
						<Text size="sm" muted>PDF, DOC up to 10MB</Text>
					</FileUpload>
				`}
			>
				<FileUpload accept=".pdf,.doc,.docx">
					<Icon icon={<Upload />} size="lg" />
					<Text size="sm" weight="medium">
						Upload documents
					</Text>
					<Text size="sm" muted>
						PDF, DOC up to 10MB
					</Text>
				</FileUpload>
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
				<div className="space-y-4">
					<FileUpload disabled />
					<FileUpload variant="input" disabled />
					<FileUpload variant="button" disabled />
				</div>
			</Example>
		</div>
	)
}
