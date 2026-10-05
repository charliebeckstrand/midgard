import api from 'virtual:docs/api/components/card'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import CardTitleSize from './card-title-size.tsx'
import CardPlayground from './playground.tsx'
import WithHeaderAndFooter from './with-header-and-footer.tsx'

export default function CardPage() {
	return (
		<>
			<Playground of={CardPlayground} api={api} />
			<Example of={CardTitleSize} />
			<Example of={WithHeaderAndFooter} />
			<ApiTable api={api} />
		</>
	)
}
