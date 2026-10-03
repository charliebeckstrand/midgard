import { useState } from 'react'
import {
	FileUploadButton,
	FileUploadDrop,
	FileUploadInput,
	formatFileNames,
} from '../../../components/file-upload'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../components/tabs'
import { Text } from '../../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

function DropAcceptExample() {
	return <FileUploadDrop accept="image/*" />
}

function InputAcceptExample() {
	return <FileUploadInput accept="image/*" />
}

function ButtonSelectedFilesExample() {
	const [files, setFiles] = useState<File[]>([])

	const manyFiles = files.length > 1

	return (
		<Stack gap="md">
			<FileUploadButton multiple onAccept={setFiles} />
			{files.length > 0 && (
				<Tooltip disabled={!manyFiles}>
					<TooltipTrigger>
						<Text tone="muted">{manyFiles ? `${files.length} files` : formatFileNames(files)}</Text>
					</TooltipTrigger>
					<TooltipContent>{formatFileNames(files)}</TooltipContent>
				</Tooltip>
			)}
		</Stack>
	)
}

function ButtonAcceptExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Stack gap="md">
			<FileUploadButton accept="image/*" onAccept={setFiles} />
			{files.length > 0 && <Text tone="muted">{formatFileNames(files)}</Text>}
		</Stack>
	)
}

export function Demo() {
	return (
		<Tabs defaultValue="drop">
			<Stack gap="lg">
				<TabList aria-label="FileUpload variant">
					<Tab value="drop">Drop</Tab>
					<Tab value="input">Input</Tab>
					<Tab value="button">Button</Tab>
				</TabList>
				<TabContents>
					<TabContent value="drop">
						<Stack gap="xl">
							<Axes of="FileUploadDrop" render={(props) => <FileUploadDrop {...props} />} />

							<Example title="Accept">
								<DropAcceptExample />
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="input">
						<Stack gap="xl">
							<Axes of="FileUploadInput" render={(props) => <FileUploadInput {...props} />} />

							<Example title="Accept">
								<InputAcceptExample />
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="button">
						<Stack gap="xl">
							<Axes of="FileUploadButton" render={(props) => <FileUploadButton {...props} />} />

							{/* Past one file, the text shows a count, and a tooltip lists the names. */}
							<Example title="Selected files">
								<ButtonSelectedFilesExample />
							</Example>

							<Example title="Accept">
								<ButtonAcceptExample />
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
