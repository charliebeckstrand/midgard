// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeReply, describeTranscript } from '../../modules/chat/engine/chat-announcements'
import type { ChatEmbedPart, ChatPart } from '../../modules/chat/engine/chat-content/types'
import type { ChatMessageData } from '../../modules/chat/engine/types'
import { englishIntl, localeIntl } from '../../primitives/intl/intl-catalog'

function text(id: string, value: string): ChatPart {
	return { kind: 'text', id, text: value }
}

function embed(id: string, name = 'stops-trend'): ChatEmbedPart {
	return { kind: 'embed', id, name, data: null }
}

const user = (content: string): ChatMessageData => ({ id: 'u1', sender: 'user', content })

const assistant = (content: string | ChatPart[]): ChatMessageData => ({
	id: 'a1',
	sender: 'assistant',
	content,
})

describe('describeReply', () => {
	it('speaks a prose reply as it reads', () => {
		expect(describeReply(englishIntl, 'Twelve stops are late.')).toBe('Twelve stops are late.')
	})

	it('speaks a reply of parts through the same projection the bubble draws', () => {
		expect(
			describeReply(englishIntl, [text('t1', 'First block.'), text('t2', 'Second block.')]),
		).toBe('First block.\n\nSecond block.')
	})

	it('counts a view rather than naming it', () => {
		// `stops-trend` addresses a renderer. Speaking it would read a developer's
		// key to a reader who cannot act on it.
		const spoken = describeReply(englishIntl, [text('t1', 'Late stops rose.'), embed('e1')])

		expect(spoken).toBe('Late stops rose.\n\n1 embedded view')

		expect(spoken).not.toContain('stops-trend')
	})

	it('counts more than one view in the plural', () => {
		expect(
			describeReply(englishIntl, [text('t1', 'Both are late.'), embed('e1'), embed('e2')]),
		).toBe('Both are late.\n\n2 embedded views')
	})

	it('speaks the count alone for a reply that is a view and nothing else', () => {
		// The projection drops an embed, so this reply reads as an empty string. It
		// still landed, and the reader must be told so.
		expect(describeReply(englishIntl, [embed('e1')])).toBe('1 embedded view')
	})

	it('says nothing for a reply that holds nothing', () => {
		expect(describeReply(englishIntl, '')).toBe('')
	})
})

describe('describeTranscript', () => {
	it('says a reply started while one is in flight', () => {
		expect(describeTranscript(englishIntl, [user('hi'), assistant('')], true)).toBe(
			'Assistant is replying',
		)
	})

	it('says the same thing at every chunk, so the announcer speaks once', () => {
		// The rule the increment rests on. A reply rewrites itself many times a
		// second; the status must not change with it.
		const first = describeTranscript(englishIntl, [user('hi'), assistant('Twelve')], true)

		const later = describeTranscript(
			englishIntl,
			[user('hi'), assistant('Twelve stops are late.')],
			true,
		)

		expect(first).toBe(later)
	})

	it('speaks the settled reply once streaming ends', () => {
		expect(
			describeTranscript(englishIntl, [user('hi'), assistant('Twelve stops are late.')], false),
		).toBe('Twelve stops are late.')
	})

	it('reads an absent streaming flag as settled', () => {
		expect(describeTranscript(englishIntl, [user('hi'), assistant('Hello')])).toBe('Hello')
	})

	it('says nothing when the reader’s own message is last', () => {
		// Between the send and the transport opening, the transcript ends on the
		// user's message. The reader wrote it, and re-speaking the reply above it
		// would repeat an announcement they already heard.
		expect(
			describeTranscript(englishIntl, [user('hi'), assistant('Hello'), user('again')], false),
		).toBe('')
	})

	it('says nothing for an empty transcript', () => {
		expect(describeTranscript(englishIntl, [], false)).toBe('')
	})

	it('says nothing when a failed send rolled its reply back', () => {
		expect(describeTranscript(englishIntl, [user('hi')], false)).toBe('')
	})
})

describe('chat announcements in a locale', () => {
	const intl = localeIntl('es-ES')

	it('says a reply started in the language of the locale', () => {
		expect(describeTranscript(intl, [user('hi'), assistant('')], true)).toBe(
			'El asistente está respondiendo',
		)
	})

	it('counts the views in the language of the locale', () => {
		expect(describeReply(intl, [text('t1', 'Ambas van tarde.'), embed('e1'), embed('e2')])).toBe(
			'Ambas van tarde.\n\n2 vistas incrustadas',
		)
	})
})
