import { useState } from 'react'
import { FileUpload, formatFileNames } from '../../../../components/file-upload'
import { Stack } from '../../../../components/stack'
import { Text } from '../../../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { Example } from '../../../engine'
import { Sizer } from './_sizer'

function ButtonSingleExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<Stack gap="md">
				<FileUpload variant="button" onFiles={setFiles} />
				{files.length > 0 && <Text severity="muted">{formatFileNames(files)}</Text>}
			</Stack>
		</Sizer>
	)
}

function ButtonMultipleExample() {
	const [files, setFiles] = useState<File[]>([])

	const manyFiles = files.length > 1

	return (
		<Sizer>
			<Stack gap="md">
				<FileUpload variant="button" multiple onFiles={setFiles} />
				{files.length > 0 && (
					<Tooltip enabled={manyFiles}>
						<TooltipTrigger>
							<Text severity="muted">
								{manyFiles ? `${files.length} files` : formatFileNames(files)}
							</Text>
						</TooltipTrigger>
						<TooltipContent>{formatFileNames(files)}</TooltipContent>
					</Tooltip>
				)}
			</Stack>
		</Sizer>
	)
}

function ButtonAcceptExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<Stack gap="md">
				<FileUpload variant="button" accept="image/*" onFiles={setFiles} />
				{files.length > 0 && <Text severity="muted">{formatFileNames(files)}</Text>}
			</Stack>
		</Sizer>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Single">
				<ButtonSingleExample />
			</Example>

			<Example title="Multiple">
				<ButtonMultipleExample />
			</Example>

			<Example title="Accept">
				<ButtonAcceptExample />
			</Example>
		</Stack>
	)
}
