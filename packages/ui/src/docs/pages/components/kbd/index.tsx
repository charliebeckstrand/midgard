import api from 'virtual:docs/api/components/kbd'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import IconKeys from './icon-keys.tsx'
import InsideAButton from './inside-a-button.tsx'
import ModifierGlyphs from './modifier-glyphs.tsx'
import KbdPlayground from './playground.tsx'

export default function KbdPage() {
	return (
		<>
			<Playground of={KbdPlayground} api={api} />
			<Example of={ModifierGlyphs} />
			<Example of={InsideAButton} />
			<Example of={IconKeys} />
			<ApiTable api={api} />
		</>
	)
}
