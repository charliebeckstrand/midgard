import api from 'virtual:docs/api/components/pdf-viewer'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import DrivenFromAList from './driven-from-a-list.tsx'
import Empty from './empty.tsx'
import FitToWidth from './fit-to-width.tsx'
import Highlights from './highlights.tsx'
import Magnifier from './magnifier.tsx'
import MagnifierSettings from './magnifier-settings.tsx'
import PdfViewerPlayground from './playground.tsx'
import Search from './search.tsx'

export default function PdfViewerPage() {
	return (
		<>
			<Playground
				of={PdfViewerPlayground}
				api={api}
				omit={['highlightUnit', 'search']}
				box="ratio"
			/>
			<Example of={Highlights} box="ratio" />
			<Example of={DrivenFromAList} box="ratio" />
			<Example of={FitToWidth} box="surface" />
			<Example of={Magnifier} box="ratio" />
			<Example of={MagnifierSettings} box="ratio" />
			<Example of={Search} box="ratio" />
			<Example of={Empty} box="surface" />
			<ApiTable api={api} />
		</>
	)
}
