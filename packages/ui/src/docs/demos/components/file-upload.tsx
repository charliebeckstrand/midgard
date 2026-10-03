import { type ReactNode, useState } from 'react'
import {
	FileUploadButton,
	FileUploadDrop,
	FileUploadInput,
	formatFileNames,
} from '../../../components/file-upload'
import { Tab, TabContent, TabContents, TabList } from '../../../components/tabs'
import { Text } from '../../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { Stack } from '../../../structure/stack'
import { Axes, Example, PageTabs } from '../../engine'

function Sizer({ children }: { children: ReactNode }) {
	return <div className="sm:max-w-sm">{children}</div>
}

function DropAcceptExample() {
	return (
		<Sizer>
			<FileUploadDrop accept="image/*" />
		</Sizer>
	)
}

function InputAcceptExample() {
	return (
		<Sizer>
			<FileUploadInput accept="image/*" />
		</Sizer>
	)
}

function ButtonSelectedFilesExample() {
	const [files, setFiles] = useState<File[]>([])

	const manyFiles = files.length > 1

	return (
		<Sizer>
			<Stack gap="md">
				<FileUploadButton multiple onAccept={setFiles} />
				{files.length > 0 && (
					<Tooltip disabled={!manyFiles}>
						<TooltipTrigger>
							<Text tone="muted">
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
				<FileUploadButton accept="image/*" onAccept={setFiles} />
				{files.length > 0 && <Text tone="muted">{formatFileNames(files)}</Text>}
			</Stack>
		</Sizer>
	)
}

export function Demo() {
	return (
		<PageTabs defaultValue="drop">
			<Stack gap="lg">
				<TabList aria-label="FileUpload variant">
					<Tab value="drop">Drop</Tab>
					<Tab value="input">Input</Tab>
					<Tab value="button">Button</Tab>
				</TabList>
				<TabContents>
					<TabContent value="drop">
						<Stack gap="xl">
							<Axes
								of="FileUploadDrop"
								render={(props) => (
									<div className="w-72">
										<FileUploadDrop {...props} />
									</div>
								)}
							/>

							<Example title="Accept">
								<DropAcceptExample />
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="input">
						<Stack gap="xl">
							<Axes
								of="FileUploadInput"
								render={(props) => (
									<div className="w-72">
										<FileUploadInput {...props} />
									</div>
								)}
							/>

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
		</PageTabs>
	)
}
