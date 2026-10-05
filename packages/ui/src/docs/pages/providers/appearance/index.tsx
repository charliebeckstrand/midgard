import api from 'virtual:docs/api/providers/appearance'
import { ApiTable, Example } from '../../../kit/index.ts'
import CurrentAppearance from './current-appearance.tsx'
import SettingsButton from './settings-button.tsx'

export default function AppearancePage() {
	return (
		<>
			<Example of={SettingsButton} />
			<Example of={CurrentAppearance} />
			<ApiTable api={api} />
		</>
	)
}
