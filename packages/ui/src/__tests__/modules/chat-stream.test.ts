import { describe, expect, it } from 'vitest'
import { TEXT_PART_ID } from '../../modules/chat/engine/chat-content/normalize'
import type { ChatEmbedPart, ChatPart } from '../../modules/chat/engine/chat-content/types'
import { applyChunk } from '../../modules/chat/engine/chat-stream'

/** The running text, under the one name a string chunk writes. */
function running(text: string): ChatPart {
	return { kind: 'text', id: TEXT_PART_ID, text }
}

function text(id: string, value: string): ChatPart {
	return { kind: 'text', id, text: value }
}

function embed(id: string, name = 'stops-map', data: unknown = null): ChatEmbedPart {
	return { kind: 'embed', id, name, data }
}

describe('applyChunk — a string chunk', () => {
	it('replaces a reply that is still a string, and leaves it one', () => {
		// The arm every transport written before parts existed takes. It must stay
		// byte-identical, and it must not allocate a part list behind the caller.
		expect(applyChunk('Hel', 'Hello')).toBe('Hello')
	})

	it('opens a reply from the empty string an opened bubble holds', () => {
		expect(applyChunk('', 'Hel')).toBe('Hel')
	})

	it('writes the running text of a reply that already holds blocks', () => {
		expect(applyChunk([running('Hel'), embed('e1')], 'Hello')).toEqual([
			running('Hello'),
			embed('e1'),
		])
	})

	it('appends the running text to a reply that arrived as a block alone', () => {
		// A chart landed first and the prose follows it. One name, so the next
		// string chunk writes this same block rather than opening a second one.
		const first = applyChunk([embed('e1')], 'Hel')

		expect(first).toEqual([embed('e1'), running('Hel')])

		expect(applyChunk(first, 'Hello')).toEqual([embed('e1'), running('Hello')])
	})

	it('holds the running text’s place rather than moving it to the end', () => {
		expect(applyChunk([running('Hel'), embed('e1'), text('t2', 'tail')], 'Hello')).toEqual([
			running('Hello'),
			embed('e1'),
			text('t2', 'tail'),
		])
	})

	it('touches no other block, whatever the prose does', () => {
		const chart = embed('e1', 'stops-map', { stops: 12 })

		const applied = applyChunk([running('Hel'), chart], 'Hello')

		expect(Array.isArray(applied) && applied[1]).toBe(chart)
	})
})

describe('applyChunk — a part chunk', () => {
	it('starts a reply from an opened bubble without a blank block above it', () => {
		// The bubble opens holding an empty string, which normalizes to one empty
		// text part. Starting a merge from that part would draw a blank line above
		// the first block that lands.
		expect(applyChunk('', [embed('e1')])).toEqual([embed('e1')])
	})

	it('keeps prose already streamed as the running text', () => {
		expect(applyChunk('Twelve stops are late.', [embed('e1')])).toEqual([
			running('Twelve stops are late.'),
			embed('e1'),
		])
	})

	it('replaces a block it names in place', () => {
		const done = embed('e1', 'stops-map', { stops: 12 })

		expect(applyChunk([embed('e1'), text('t2', 'tail')], [done])).toEqual([
			done,
			text('t2', 'tail'),
		])
	})

	it('replaces a block whole rather than merging its fields', () => {
		// A tool call that turns from running to done sends the block it has
		// become. A field-wise merge would leave the fields it dropped standing.
		const applied = applyChunk([embed('e1', 'stops-map', { pending: true })], [embed('e1')])

		expect(applied).toEqual([{ kind: 'embed', id: 'e1', name: 'stops-map', data: null }])
	})

	it('appends a block it does not already hold, in the order the chunk lists them', () => {
		expect(applyChunk([running('Hello')], [embed('e1'), embed('e2')])).toEqual([
			running('Hello'),
			embed('e1'),
			embed('e2'),
		])
	})

	it('folds a chunk that both replaces and appends', () => {
		const applied = applyChunk(
			[running('Hello'), embed('e1')],
			[embed('e1', 'stops-map', { stops: 12 }), embed('e2')],
		)

		expect(applied).toEqual([
			running('Hello'),
			embed('e1', 'stops-map', { stops: 12 }),
			embed('e2'),
		])
	})

	it('reads an id and never a position, so an insertion moves nothing it names', () => {
		// The claim the increment rests on. Under a positional fold the arriving
		// block would land on `t1` after the insertion shifted every index.
		const held = [text('t1', 'first'), embed('e1'), text('t2', 'second')]

		expect(applyChunk(held, [text('t2', 'rewritten')])).toEqual([
			text('t1', 'first'),
			embed('e1'),
			text('t2', 'rewritten'),
		])
	})

	it('takes the last block a chunk names twice, at the first one’s place', () => {
		expect(
			applyChunk([running('Hello')], [embed('e1'), embed('e2'), embed('e1', 'late-grid')]),
		).toEqual([running('Hello'), embed('e1', 'late-grid'), embed('e2')])
	})

	it('changes nothing for a chunk that carries no block', () => {
		expect(applyChunk([running('Hello')], [])).toEqual([running('Hello')])
	})

	it('leaves the content it read intact', () => {
		const held: ChatPart[] = [running('Hello')]

		expect(applyChunk(held, [embed('e1')])).not.toBe(held)

		expect(held).toEqual([running('Hello')])
	})
})
