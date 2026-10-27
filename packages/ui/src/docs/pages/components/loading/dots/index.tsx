import api from 'virtual:docs/api/components/loading'
import { Example, Playground } from '../../../../kit/index.ts'
import InsideAButton from './inside-a-button.tsx'
import LoadingDotsPlayground from './playground.tsx'

export default function DotsTab() {
	return (
		<>
			<Playground of={LoadingDotsPlayground} api={api} />
			<Example of={InsideAButton} />
		</>
	)
}
