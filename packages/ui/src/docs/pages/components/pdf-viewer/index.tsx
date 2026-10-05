import api from 'virtual:docs/api/components/pdf-viewer'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import DrivenFromAList from './driven-from-a-list.tsx'
import Empty from './empty.tsx'
import FitToWidth from './fit-to-width.tsx'
import Highlights from './highlights.tsx'
import Magnifier from './magnifier.tsx'
import MagnifierSettings from './magnifier-settings.tsx'
import PdfViewerPlayground from './playground.tsx'

export default function PdfViewerPage() {
	return (
		<>
			<Playground of={PdfViewerPlayground} api={api} omit={['highlightUnit']} />
			<Example of={Highlights} />
			<Example of={DrivenFromAList} />
			<Example of={FitToWidth} />
			<Example of={Magnifier} />
			<Example of={MagnifierSettings} />
			<Example of={Empty} />
			<ApiTable api={api} />
		</>
	)
}
