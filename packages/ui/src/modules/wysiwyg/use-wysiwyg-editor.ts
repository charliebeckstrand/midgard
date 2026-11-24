'use client'

import { type RefObject, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { useIdlePreload } from '../../hooks/use-idle-preload'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { useStableEvent } from '../../hooks/use-stable-event'
import { createEmitter } from '../../utilities/emitter'
import { createLazyModule } from '../../utilities/lazy-module'
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
 * a page before the load.
 *
 * @internal
 */
export function __resetWysiwygEngine(): void {
	engine = createLazyModule(loadEngine)
}

/** @internal */
type WysiwygEditorOptions = {
	/** The element that holds the field. The editable element of the editor goes in it. */
	host: RefObject<HTMLDivElement | null>
	/** The Markdown source of the field. */
	value: string
	/** Loads the editor at once, such as on the first focus or press. Without it, the editor loads in idle time. */
	wanted: boolean
	/** The settings of the editor, but the two events that this hook owns. */
	props: Omit<WysiwygEditorProps, 'onChange' | 'onUpdate'>
	/** Fires with the Markdown of the doc after each edit. */
	onChange: (markdown: string) => void
}

/**
 * The editor of a Wysiwyg field. It loads the engine in idle time, or at once
 * while `wanted` is true, and then makes the editor in `host`. It gives each
 * render the new settings, and it replaces the doc when `value` differs from
 * the source of the doc, such as on a clear after a send, or on an edit that
 * a controlled parent refuses.
 *
 * @returns The editor, or `null` until it loads, and the subscription to each
 *   new state of the editor.
 * @remarks The editor is the source of the doc while it lives. It holds the
 * last Markdown that it emitted, so the value that comes back after an edit
 * does not replace the doc again.
 * @internal
 */
export function useWysiwygEditor({ host, value, wanted, props, onChange }: WysiwygEditorOptions) {
	useIdlePreload(engine)

	const loaded = useLazyModule(engine, wanted)

	const [editor, setEditor] = useState<WysiwygEditor | null>(null)

	const [updates] = useState(createEmitter)

	// The Markdown source of the doc: the value at the creation, then the last
	// value that the editor emitted or that the field set.
	const source = useRef(value)

	// A render after each edit, so the sync below compares the doc with the
	// value even when the parent refuses the edit and does not render.
	const [, checkValue] = useReducer((count: number) => count + 1, 0)

	const handleChange = useStableEvent((markdown: string) => {
		source.current = markdown

		onChange(markdown)

		checkValue()
	})

	const editorProps: WysiwygEditorProps = {
		...props,
		onChange: handleChange,
		onUpdate: updates.emit,
	}

	const create = useStableEvent((module: typeof Engine, element: HTMLElement) => {
		// The markup before the load can have the focus. The editor then takes it.
		const focused = element.contains(element.ownerDocument.activeElement)

		source.current = value

		const next = module.createWysiwygEditor(element, value, editorProps)

		if (focused) next.view.focus()

		return next
	})

	// A layout effect, so the editor replaces the markup before the paint.
	useLayoutEffect(() => {
		const element = host.current

		if (!loaded || !element) return

		const next = create(loaded, element)

		setEditor(next)

		return () => {
			next.destroy()

			setEditor(null)
		}
	}, [loaded, host, create])

	// Each render gives the editor its new settings.
	useLayoutEffect(() => {
		editor?.update(editorProps)
	})

	// The doc shows the value after each commit, as a controlled `<textarea>`
	// does. A parent that refuses an edit thus takes the edit out of the doc.
	useLayoutEffect(() => {
		if (!editor || value === source.current) return

		source.current = value

		editor.setValue(value)
	})

	return { editor, subscribe: updates.subscribe }
}
