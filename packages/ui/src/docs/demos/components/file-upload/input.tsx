import { FileUpload } from '../../../../components/file-upload'
import { Stack } from '../../../../components/stack'
import { Example } from '../../../engine'
import { Sizer } from './_sizer'

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

export function Demo() {
	return (
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
	)
}
