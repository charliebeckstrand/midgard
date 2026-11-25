'use client'

import {
	type RefObject,
	useLayoutEffect,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import type { MarkdownRange } from '../../components/markdown/markdown-ranges'
import { useIdlePreload } from '../../hooks/use-idle-preload'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { useStableEvent } from '../../hooks/use-stable-event'
import { createEmitter } from '../../utilities/emitter'
import { createLazyModule } from '../../utilities/lazy-module'
import { createEarlyInput, type WysiwygEarlyInput } from './wysiwyg-early-input'
import type * as Engine from './wysiwyg-editor'
import type { WysiwygEditor, WysiwygEditorProps } from './wysiwyg-editor'

const loadEngine = () => import('./wysiwyg-editor')

/**
 * The editor module. A page with no field loads none of it, and the fields of
 * a page share one load.
 *
 * @internal
 */
let engine = createLazyModule(loadEngine)

/**
 * Test-only: forgets the load of the editor module, so the next case starts as
 * a page before the load. A case can give its own `importer`, such as one that
 * holds the load as a slow page does.
 *
 * @internal
 */
export function __resetWysiwygEngine(importer: () => Promise<typeof Engine> = loadEngine): void {
	engine = createLazyModule(importer)
}

/** The load that {@link loadEngineNow} reports, so it reports each load once. @internal */
let reported: Promise<unknown> | null = null

/**
 * Starts the load of the editor module at once. The fields share the load. A
 * load that fails goes on as one unhandled rejection, so it reaches the error
 * reporting of the app, and the next call tries again. The rejection is of a
 * promise of its own: the idle load handles the rejection of the shared
 * promise. A hover and the focus after it call this twice, and the
 * two calls get the same load, so only the first call reports it.
 *
 * @internal
 */
function loadEngineNow(): void {
	const load = engine.load()

	if (load === reported) return

	reported = load

	load.catch((error: unknown) => {
		throw error
	})
}

/** @internal */
type WysiwygEditorOptions = {
	/** The element that holds the field. The editable element of the editor goes in it. */
	host: RefObject<HTMLDivElement | null>
	/** The Markdown source of the field. */
	value: string
	/** The ranges of `value`. */
	ranges: readonly MarkdownRange[]
	/** The settings of the editor, but the two events that this hook owns. */
	props: Omit<WysiwygEditorProps, 'onChange' | 'onUpdate'>
	/** Fires with the Markdown of the doc and its ranges after each edit. */
	onChange: (markdown: string, ranges: MarkdownRange[]) => void
	/** Fires when the doc takes `value` and `ranges` in place of its source, which starts a new undo history. */
	onSet: () => void
}

/** A Markdown source and its ranges. @internal */
type Source = { value: string; ranges: readonly MarkdownRange[] }

/**
 * Whether two sources are one source. A range is the same range when its id,
 * its offsets, and its quote are, so a caller can give the ranges back as new
 * objects with more fields.
 *
 * @internal
 */
function sameSource(a: Source, b: Source): boolean {
	return (
		a.value === b.value &&
		a.ranges.length === b.ranges.length &&
		a.ranges.every((range, index) => {
			const other = b.ranges[index]

			return (
				other !== undefined &&
				range.id === other.id &&
				range.start === other.start &&
				range.end === other.end &&
				range.quote === other.quote
			)
		})
	)
}

/**
 * The editor of a Wysiwyg field. It loads the engine in idle time, or at once
 * on a call of `load` or `whenReady`, and then makes the editor in `host`. The
 * editor takes the edits that the reader made in the markup before the load
 * ({@link WysiwygEarlyInput}). The hook gives each render the new settings,
 * and it replaces the doc when `value` or `ranges` differ from the source of
 * the doc, such as on a clear after a send, or on an edit that a controlled
 * parent refuses.
 *
 * @returns The editor, or `null` until it loads, the subscription to each new
 *   state of the editor, whether the engine was loaded at the first render,
 *   `load`, which starts the load of the engine at once, `whenReady`, which
 *   runs a task on the editor, and `early`, the input before the load. Call
 *   `load` in the event that wants the editor, such as the first focus or
 *   hover, so the load does not wait for a render and its effects. `whenReady`
 *   runs its task at once on an editor. Before the editor, it starts the load,
 *   and the task waits. The tasks then run in the order of their calls, after
 *   the editor takes the focus. Each task runs in its own commit, as each
 *   input of the reader does. Thus a task such as a send reads the value of
 *   the edits before it.
 * @remarks The editor is the source of the doc while it lives. It holds the
 * last Markdown that it emitted, so the value that comes back after an edit
 * does not replace the doc again.
 * @internal
 */
export function useWysiwygEditor({
	host,
	value,
	ranges,
	props,
	onChange,
	onSet,
}: WysiwygEditorOptions) {
	useIdlePreload(engine)

	const loaded = useLazyModule(engine, false)

	// Whether the engine was loaded at the first render, such as for the second
	// field of a page. The editor then replaces nothing, so the field draws no
	// markup before it. The hydration render reads no engine, so the server
	// markup stays.
	const [loadedAtMount] = useState(loaded !== null)

	const [editor, setEditor] = useState<WysiwygEditor | null>(null)

	const [updates] = useState(createEmitter)

	// The Markdown source of the doc and its ranges: the value at the creation,
	// then the last value that the editor emitted or that the field set.
	const source = useRef<Source>({ value, ranges })

	// A render after each edit, so the sync below compares the doc with the
	// value even when the parent refuses the edit and does not render.
	const [, checkValue] = useReducer((count: number) => count + 1, 0)

	const handleChange = useStableEvent((markdown: string, next: MarkdownRange[]) => {
		source.current = { value: markdown, ranges: next }

		onChange(markdown, next)

		checkValue()
	})

	const editorProps: WysiwygEditorProps = {
		...props,
		onChange: handleChange,
		onUpdate: updates.emit,
	}

	// The input before the load, which the editor takes when it loads.
	const [early] = useState(createEarlyInput)

	const composing = useSyncExternalStore(early.subscribe, early.composing, early.composing)

	// The editor from its creation to its destruction. The state above comes a
	// render later.
	const live = useRef<WysiwygEditor | null>(null)

	// A render that runs the next task of the queue, so each task runs after
	// the commit of the one before it, as each input of the reader does.
	const [, runNext] = useReducer((count: number) => count + 1, 0)

	const create = useStableEvent((module: typeof Engine, element: HTMLElement) => {
		// The markup before the load can have the focus. The editor then takes it.
		const focused = element.contains(element.ownerDocument.activeElement)

		const field = element.firstElementChild

		source.current = { value, ranges }

		const created = module.createWysiwygEditor(element, value, ranges, editorProps)

		// The editor takes the edits of the reader in the markup, which drew the
		// value that the editor has. A value that a parent set after the first
		// edit wins, as a set wins over the doc of the editor.
		const edited = early.edited()

		if (field && (edited === null || sameSource(edited, source.current))) {
			created.adopt(early.take(field))
		}

		if (focused) created.focus()

		return created
	})

	// A layout effect, so the editor replaces the markup before the paint. An
	// input method composition in the markup goes on to its end first, so the
	// reader keeps the composition.
	useLayoutEffect(() => {
		const element = host.current

		if (!loaded || !element || composing) return

		const created = create(loaded, element)

		live.current = created

		setEditor(created)

		return () => {
			live.current = null

			created.destroy()

			setEditor(null)
		}
	}, [loaded, host, create, composing])

	// Runs a task on the editor: now, or when the editor loads and the tasks
	// before it ran. A task that waits starts the load.
	const whenReady = useStableEvent((task: (ready: WysiwygEditor) => void) => {
		const ready = live.current

		if (ready && !early.held()) {
			task(ready)

			return
		}

		early.hold(task, host.current?.firstElementChild ?? null)

		if (!ready) loadEngineNow()
	})

	// Each render gives the editor its new settings.
	useLayoutEffect(() => {
		editor?.update(editorProps)
	})

	// The doc shows the value after each commit, as a controlled `<textarea>`
	// does. A parent that refuses an edit thus takes the edit out of the doc.
	useLayoutEffect(() => {
		const current = { value, ranges }

		if (!editor || sameSource(current, source.current)) return

		source.current = current

		editor.setValue(value, ranges)

		onSet()
	})

	// Each commit with the editor runs the next task of the queue, after the
	// editor has the settings and the value of the commit. A render then runs
	// the task after it.
	useLayoutEffect(() => {
		if (editor && early.held() && early.next(editor)) runNext()
	})

	return {
		editor,
		subscribe: updates.subscribe,
		loadedAtMount,
		load: loadEngineNow,
		whenReady,
		early,
	}
}
