import { ChatMessage } from '../../../../components/chat-message'
import { ChatPrompt } from '../../../../components/chat-prompt'
import { Headless } from '../../../../components/headless'
import { Input } from '../../../../components/input'
import type { Case } from '../types'

const noop = () => {}

/** Domain & specialized surfaces, plus the headless escape hatch. */
export const specializedCases: readonly Case[] = [
	[
		'chat message',
		<ChatMessage key="cm" type="assistant" timestamp="11:10 AM">
			How can I help you today?
		</ChatMessage>,
	],
	[
		// Controlled prompt composer; the textarea is the labelled control.
		'chat prompt',
		<ChatPrompt key="cp" value="" onValueChange={noop} onSubmit={noop} placeholder="Message" />,
	],
	[
		// Escape hatch: renders its single child untouched, suppressing default
		// control chrome. Wrapping a labelled input must stay axe-clean.
		'headless',
		<Headless key="hl">
			<Input aria-label="Raw input" />
		</Headless>,
	],
]
