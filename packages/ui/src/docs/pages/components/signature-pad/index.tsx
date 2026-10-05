import api from 'virtual:docs/api/components/signature-pad'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ImperativeHandle from './imperative-handle.tsx'
import InAForm from './in-a-form.tsx'
import SignaturePadPlayground from './playground.tsx'
import PreviewAndDownload from './preview-and-download.tsx'
import StrokeStyle from './stroke-style.tsx'

export default function SignaturePadPage() {
	return (
		<>
			<Playground of={SignaturePadPlayground} api={api} />
			<Example of={PreviewAndDownload} />
			<Example of={InAForm} />
			<Example of={ImperativeHandle} />
			<Example of={StrokeStyle} />
			<ApiTable api={api} />
		</>
	)
}
