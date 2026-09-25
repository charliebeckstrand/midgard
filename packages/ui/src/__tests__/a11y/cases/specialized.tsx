import { Input } from '../../../components/input'
import { PdfViewer, type PdfViewerPage } from '../../../components/pdf-viewer'
import {
	ChatMessage,
	type ChatMessageData,
	ChatPrompt,
	ChatTranscript,
} from '../../../modules/chat'
import { HeadlessProvider } from '../../../providers/headless'
import { noop } from '../../helpers'
import type { Case } from './types'

// Pre-rendered image pages: bypass the pdf.js (`src`) path; synchronous, no
// canvas or worker.
const pdfPages: PdfViewerPage[] = [
	{ id: 'p1', src: 'page-1.png', label: 'Page 1' },
	{ id: 'p2', src: 'page-2.png', label: 'Page 2' },
]

const transcript: ChatMessageData[] = [
	{ id: 'u1', role: 'user', content: 'How are late stops trending?' },
	{ id: 'a1', role: 'assistant', content: 'Late stops rose from **4** to **14**.' },
]

/** A history long enough that the window holds a slice of it, not all of it. */
const longTranscript: ChatMessageData[] = Array.from({ length: 60 }, (_, index) => ({
	id: `h${index}`,
	role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
	content: `Stop ${index} is late by ${index % 7} minutes.`,
}))

// A reply naming a renderer nothing is registered under, so the stated fallback
// draws. It is muted text on the assistant bubble's fill, which is a contrast
// pair no other case covers.
/** A reply showing its working: one step open to a detail, and all three states. */
const toolSteps: ChatMessageData[] = [
	{
		id: 'a1',
		role: 'assistant',
		content: [
			{
				kind: 'tool',
				id: 's1',
				name: 'Filter shipments',
				status: 'done',
				summary: 'status is late',
				detail: 'Matched **12** of 240 rows.',
			},
			{ kind: 'tool', id: 's2', name: 'Score routes', status: 'running' },
			{ kind: 'tool', id: 's3', name: 'Fetch weather', status: 'failed' },
			{ kind: 'text', id: 't1', text: 'Twelve are late.' },
		],
	},
]

const unclaimedEmbed: ChatMessageData[] = [
	{
		id: 'a1',
		role: 'assistant',
		content: [
			{ kind: 'text', id: 't1', text: 'Here are those stops on the map.' },
			{ kind: 'embed', id: 'e1', name: 'stops-map', data: null },
		],
	},
]

/** Domain & specialized surfaces, plus the headless escape hatch. */
export const specializedCases: readonly Case[] = [
	{
		name: 'chat message',
		element: (
			<ChatMessage key="cm" role="assistant" timestamp="11:10 AM">
				How can I help you today?
			</ChatMessage>
		),
	},
	{
		// The `log` region increment 6 gave the transcript, with its own aria-live
		// off so the shared announcer stays the one channel. A history this short
		// fits the window, so the log holds every message.
		name: 'chat transcript',
		element: <ChatTranscript key="ct" messages={transcript} />,
	},
	{
		// A reader who walks a long log finds a slice: the rows near the viewport,
		// newest last, between two spacers hidden from assistive technology. Where
		// nothing lays out, as in jsdom, the slice is the newest twenty messages.
		name: 'chat transcript, windowed',
		element: <ChatTranscript key="ctw" messages={longTranscript} />,
	},
	{
		name: 'chat transcript with an unclaimed embed',
		element: <ChatTranscript key="cte" messages={unclaimedEmbed} />,
	},
	{
		// A step is a disclosure inside the bubble: its trigger has to clear
		// target-size, and its status dot conveys state by hue alone, so the dot
		// carries the word as its accessible name.
		name: 'chat transcript with steps',
		element: <ChatTranscript key="cts" messages={toolSteps} />,
	},
	{
		// Controlled prompt composer; the textarea is the labeled control.
		name: 'chat prompt',
		element: (
			<ChatPrompt key="cp" value="" onValueChange={noop} onSubmit={noop} placeholder="Message" />
		),
	},
	{
		// Removable attachment chips: the outline badge + bare remove button must
		// clear contrast and carry an accessible name.
		name: 'chat prompt with attachments',
		element: (
			<ChatPrompt
				key="cpa"
				value=""
				onValueChange={noop}
				onSubmit={noop}
				placeholder="Message"
				attachments={[new File(['x'], 'report.pdf', { type: 'application/pdf' })]}
				onRemoveAttachment={noop}
			/>
		),
	},
	{
		// Escape hatch: renders its single child untouched, suppressing default
		// control chrome. Wrapping a labeled input must stay axe-clean.
		name: 'headless',
		element: (
			<HeadlessProvider key="hl">
				<Input aria-label="Raw input" />
			</HeadlessProvider>
		),
	},
	{
		// Document viewer driven by pre-rendered image pages (no pdf.js): a labeled
		// region with toolbar controls and alt-texted page images.
		name: 'pdf viewer',
		element: <PdfViewer key="pv" pages={pdfPages} aria-label="Quarterly report" />,
	},
]
