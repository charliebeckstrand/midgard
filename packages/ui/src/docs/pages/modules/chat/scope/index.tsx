import { Example } from '../../../../kit/index.ts'
import AskAboutAChart from './ask-about-a-chart.tsx'
import MentionsAndCommands from './mentions-and-commands.tsx'

export default function ScopeTab() {
	return (
		<>
			<Example of={MentionsAndCommands} box="surface" />
			<Example of={AskAboutAChart} box="surface" />
		</>
	)
}
