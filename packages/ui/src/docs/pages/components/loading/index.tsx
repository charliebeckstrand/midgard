import api from 'virtual:docs/api/components/loading'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import InsideAButton from './inside-a-button.tsx'
import LoadingPlayground from './playground.tsx'
import LoadingDotsPlayground from './playground-dots.tsx'

export default function LoadingPage() {
	return (
		<>
			<Playground of={[LoadingPlayground, LoadingDotsPlayground]} api={api} />
			<Example of={InsideAButton} />
			<ApiTable api={api} />
		</>
	)
}
