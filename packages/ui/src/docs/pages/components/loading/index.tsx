import api from 'virtual:docs/api/components/loading'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import DotsColor from './dots-color.tsx'
import DotsSize from './dots-size.tsx'
import InsideAButton from './inside-a-button.tsx'
import LoadingPlayground from './playground.tsx'

export default function LoadingPage() {
	return (
		<>
			<Playground of={LoadingPlayground} api={api} />
			<Example of={DotsSize} />
			<Example of={DotsColor} />
			<Example of={InsideAButton} />
			<ApiTable api={api} />
		</>
	)
}
