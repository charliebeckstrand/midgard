import api from 'virtual:docs/api/components/accordion'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import DisabledItem from './disabled-item.tsx'
import Multiple from './multiple.tsx'
import AccordionPlayground from './playground.tsx'

export default function AccordionPage() {
	return (
		<>
			<Playground of={AccordionPlayground} api={api} omit={['type', 'mount']} />
			<Example of={Multiple} />
			<Example of={DisabledItem} />
			<ApiTable api={api} />
		</>
	)
}
