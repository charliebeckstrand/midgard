import { describe, expect, it } from 'vitest'
import { splitChatSegments } from '../../modules/chat/chat-message-segments'

describe('splitChatSegments', () => {
	it('returns one prose segment for a message with no chart fence', () => {
		expect(splitChatSegments('Hello **world**')).toEqual([
			{ kind: 'prose', content: 'Hello **world**' },
		])
	})

	it('splits prose, chart, and prose at a closed chart fence', () => {
		const source = 'Before\n\n```chart\n{"type":"line"}\n```\n\nAfter'

		expect(splitChatSegments(source)).toEqual([
			{ kind: 'prose', content: 'Before\n' },
			{ kind: 'chart', code: '{"type":"line"}', closed: true },
			{ kind: 'prose', content: '\nAfter' },
		])
	})

	it('marks an unterminated trailing chart fence as open (streaming in)', () => {
		const source = 'Loading:\n\n```chart\n{"type":"line","data":['

		expect(splitChatSegments(source)).toEqual([
			{ kind: 'prose', content: 'Loading:\n' },
			{ kind: 'chart', code: '{"type":"line","data":[', closed: false },
		])
	})

	it('emits back-to-back charts with no prose between them', () => {
		const source = '```chart\na\n```\n```chart\nb\n```'

		expect(splitChatSegments(source)).toEqual([
			{ kind: 'chart', code: 'a', closed: true },
			{ kind: 'chart', code: 'b', closed: true },
		])
	})

	it('leaves a chart fence nested inside another code block in the prose', () => {
		// The outer ```md block is prose; its inner ```chart line must not split.
		const source = 'Example:\n\n```md\n```chart\n{"type":"line"}\n```\n```'

		const segments = splitChatSegments(source)

		expect(segments).toHaveLength(1)

		expect(segments[0]?.kind).toBe('prose')

		expect(segments.some((s) => s.kind === 'chart')).toBe(false)
	})

	it('keeps a non-chart fence as prose', () => {
		const source = '```tsx\nconst x = 1\n```'

		expect(splitChatSegments(source)).toEqual([{ kind: 'prose', content: source }])
	})

	it('preserves an empty source as a single (empty) prose segment', () => {
		expect(splitChatSegments('')).toEqual([{ kind: 'prose', content: '' }])
	})
})
