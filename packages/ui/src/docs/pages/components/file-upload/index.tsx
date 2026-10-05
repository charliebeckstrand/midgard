import api from 'virtual:docs/api/components/file-upload'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import FileUploadPlayground from './playground.tsx'
import RejectedFiles from './rejected-files.tsx'
import SelectedFiles from './selected-files.tsx'
import UploadProgress from './upload-progress.tsx'

export default function FileUploadPage() {
	return (
		<>
			<Playground of={FileUploadPlayground} api={api} />
			<Example of={UploadProgress} />
			<Example of={RejectedFiles} />
			<Example of={SelectedFiles} />
			<ApiTable api={api} />
		</>
	)
}
