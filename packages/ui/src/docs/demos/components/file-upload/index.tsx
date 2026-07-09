import { FileUpload } from '../../../../components/file-upload'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'
import { Sizer } from './_sizer'

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

export function Demo() {
	return (
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
	)
}
