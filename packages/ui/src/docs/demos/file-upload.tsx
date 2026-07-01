import { type ReactNode, useState } from 'react'
import { FileUpload, formatFileNames } from '../../components/file-upload'
import { Stack } from '../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../components/tabs'
import { Text } from '../../components/text'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { Example } from '../engine'

function Sizer({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={`sm:max-w-sm ${className}`}>{children}</div>
}

function DropSingleExample() {
	return (
		<Sizer>
			<FileUpload />
		</Sizer>
	)
}

function DropMultipleExample() {
	return (
		<Sizer>
			<FileUpload multiple />
		</Sizer>
	)
}

function DropAcceptExample() {
	return (
		<Sizer>
			<FileUpload accept="image/*" />
		</Sizer>
	)
}

function InputSingleExample() {
	return (
		<Sizer>
			<FileUpload variant="input" />
		</Sizer>
	)
}

function InputMultipleExample() {
	return (
		<Sizer>
			<FileUpload variant="input" multiple />
		</Sizer>
	)
}

function InputAcceptExample() {
	return (
		<Sizer>
			<FileUpload variant="input" accept="image/*" />
		</Sizer>
	)
}

function ButtonSingleExample() {
	const [files, setFiles] = useState<File[]>([])

	return (
		<Sizer>
			<Stack gap="md">
				<FileUpload variant="button" onFiles={setFiles} />
				{files.length > 0 && <Text severity="muted">Selected: {formatFileNames(files)}</Text>}
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
								Selected: {manyFiles ? `${files.length} files` : formatFileNames(files)}
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
				{files.length > 0 && <Text severity="muted">Selected: {formatFileNames(files)}</Text>}
			</Stack>
		</Sizer>
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
							<Example title="Single">
								<DropSingleExample />
							</Example>

							<Example title="Multiple">
								<DropMultipleExample />
							</Example>

							<Example title="Accept">
								<DropAcceptExample />
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="input">
						<Stack gap="xl">
							<Example title="Single">
								<InputSingleExample />
							</Example>

							<Example title="Multiple">
								<InputMultipleExample />
							</Example>

							<Example title="Accept">
								<InputAcceptExample />
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="button">
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
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
