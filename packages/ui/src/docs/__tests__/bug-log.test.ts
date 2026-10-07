import { describe, expect, it, onTestFinished } from 'vitest'
import { attach } from '../../__tests__/helpers/attach.ts'
import { BugLog, CAPACITY, TRAIL } from '../debug/bug-log/log.ts'
import { markdownOf } from '../debug/bug-log/markdown.ts'
import { type Entry, EventLog, OWN } from '../debug/event-log/log.ts'
import { halt, listen, startBugs } from '../debug/event-log/recorder.ts'
import type { Line } from '../debug/event-log/sources.ts'
import type { Store } from '../debug/journal.ts'

/** A `sessionStorage` in memory. A new log on the same store is a reload of the tab. */
function createStore(): Store {
	const items = new Map<string, string>()

	return {
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => {
			items.set(key, value)
		},
		removeItem: (key) => {
			items.delete(key)
		},
	}
}

/** An error line with a stack. */
function errorLine(text: string, frames: string[] = ['at rows (grid.js:1:2)']): Line {
	return { kind: 'error', text, detail: { stack: frames } }
}

function entry(time: number): Entry {
	return { time, kind: 'input', text: `input at ${time}`, y: 0 }
}

/** A Bug log on a store in memory, with an Event log that holds `entries`. */
function createBugLog(store: Store = createStore(), entries: readonly Entry[] = []): BugLog {
	const log = new EventLog(createStore())

	log.entries = entries

	return new BugLog(store, log)
}

describe('BugLog', () => {
	it('files a report with the stack, the page, and the last lines of the log', () => {
		const entries = Array.from({ length: TRAIL + 5 }, (_, index) => entry(index))

		const bugs = createBugLog(createStore(), entries)

		bugs.file(errorLine('Uncaught Error: boom'))

		const [report] = bugs.entries

		expect(report?.title).toBe('Uncaught Error: boom')

		expect(report?.stack).toEqual(['at rows (grid.js:1:2)'])

		expect(report?.count).toBe(1)

		expect(report?.page).toBe(location.pathname + location.search + location.hash)

		expect(report?.trail).toHaveLength(TRAIL)

		expect(report?.trail.at(-1)).toContain(`input at ${TRAIL + 4}`)
	})

	it('counts the same error in its first report, and files a new report for another first frame', () => {
		const bugs = createBugLog()

		bugs.file(errorLine('Uncaught Error: boom'))

		bugs.file(errorLine('Uncaught Error: boom'))

		bugs.file(errorLine('Uncaught Error: boom', ['at cells (grid.js:9:9)']))

		expect(bugs.entries.map(({ count }) => count)).toEqual([2, 1])
	})

	it('files a capture, and removes a report by its id', () => {
		const bugs = createBugLog()

		bugs.file(errorLine('Uncaught Error: boom'))

		bugs.capture()

		expect(bugs.entries.map(({ title }) => title)).toEqual(['Uncaught Error: boom', 'capture'])

		bugs.remove(bugs.entries[0]?.id ?? 0)

		expect(bugs.entries.map(({ title }) => title)).toEqual(['capture'])
	})

	it('keeps the newest reports up to the capacity', () => {
		const bugs = createBugLog()

		for (let index = 0; index <= CAPACITY; index++) bugs.file(errorLine(`error ${index}`))

		expect(bugs.entries).toHaveLength(CAPACITY)

		expect(bugs.entries[0]?.title).toBe('error 1')
	})

	it('keeps the reports through a reload while "Preserve" is on, apart from the Event log', () => {
		const store = createStore()

		const bugs = createBugLog(store)

		bugs.preserve = true

		bugs.capture()

		bugs.save()

		expect(createBugLog(store).entries).toHaveLength(1)

		expect(new EventLog(store).preserve).toBe(false)
	})

	it('names the element of the last pointerdown and focus outside the tools, and skips while paused', () => {
		const log = new EventLog(createStore())

		const bugs = new BugLog(createStore(), log)

		onTestFinished(bugs.watch())

		const region = attach(document.createElement('div'))

		region.setAttribute('data-slot', 'region')

		const button = region.appendChild(document.createElement('button'))

		button.setAttribute('data-slot', 'button')

		const own = attach(document.createElement('button'))

		own.setAttribute(OWN, '')

		button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

		// A tap on the button of a tool, and a tap while a debug sheet is open, do not count.
		own.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		log.paused = true

		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

		bugs.capture()

		const [report] = bugs.entries

		expect(report?.pointer).toMatch(/^div\[region\] > button\[button\] at /)

		expect(report?.focus).toMatch(/^div\[region\] > button\[button\] at /)
	})
})

describe('listen', () => {
	it('files a report for each error line of the log, also while the log is paused', () => {
		const log = new EventLog(createStore())

		const bugs = new BugLog(createStore(), log)

		onTestFinished(listen(log, bugs))

		log.paused = true

		window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))

		expect(bugs.entries.map(({ title }) => title)).toEqual(['boom'])

		expect(bugs.entries[0]?.stack[0]).toContain('Error: boom')
	})
})

describe('startBugs', () => {
	it('sets the attribute of the dot while the Bug log holds a report', () => {
		onTestFinished(halt)

		const root = document.documentElement

		const bugs = startBugs()

		expect(root.hasAttribute('data-bugs')).toBe(false)

		bugs.capture()

		expect(root.hasAttribute('data-bugs')).toBe(true)

		halt()

		expect(root.hasAttribute('data-bugs')).toBe(false)
	})
})

describe('markdownOf', () => {
	it('writes a report as a heading, a table, and fenced blocks', () => {
		const bugs = createBugLog(createStore(), [entry(7)])

		bugs.file(errorLine('Uncaught Error: a | b'))

		bugs.file(errorLine('Uncaught Error: a | b'))

		const [report] = bugs.entries

		if (!report) throw new Error('no report')

		const markdown = markdownOf({ ...report, pointer: undefined, focus: undefined })

		expect(markdown).toMatch(
			/^## Uncaught Error: a \| b ×2\n\n\| Field \| Value \|\n\|:---\|:---\|\n/,
		)

		expect(markdown).toContain('### Stack\n\n```text\nat rows (grid.js:1:2)\n```')

		expect(markdown).toContain('### Trail\n\n```text\n')

		expect(markdown).not.toContain('| Pointer |')

		expect(markdown).not.toContain('### Component stack')
	})
})
