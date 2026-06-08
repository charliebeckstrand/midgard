import { ChatMessage } from '../../../components/chat-message'
import { ChatPrompt } from '../../../components/chat-prompt'
import { Headless } from '../../../components/headless'
import { Input } from '../../../components/input'
import { PdfViewer, type PdfViewerPage } from '../../../components/pdf-viewer'
import type { Case } from './types'

const noop = () => {}

// Pre-rendered image pages: bypass the pdf.js (`src`) path; synchronous, no
// canvas or worker.
const pdfPages: PdfViewerPage[] = [
	{ id: 'p1', src: 'page-1.png', label: 'Page 1' },
	{ id: 'p2', src: 'page-2.png', label: 'Page 2' },
]

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
	[
		// Document viewer driven by pre-rendered image pages (no pdf.js): a labelled
		// region with toolbar controls and alt-texted page images.
		'pdf viewer',
		<PdfViewer key="pv" pages={pdfPages} aria-label="Quarterly report" />,
	],
]
