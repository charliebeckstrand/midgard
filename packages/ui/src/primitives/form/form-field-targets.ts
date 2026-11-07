import { createEmitter } from '../../utilities/emitter'

/**
 * The target of one field in an error summary: the id of its control, and the
 * text of its label when a field `Label` names that control.
 *
 * @internal
 */
export type FormFieldTarget = {
	id: string
	label?: string
}

/**
 * The control ids and the labels of the fields of one form, by field name. A
 * control that binds a field registers the id of its control, and so does a
 * form-bound `Message`. A field `Label` registers its text by the id of its
 * control. A `FormErrorSummary` links each invalid field to that id, and names
 * the field with that text.
 *
 * @internal
 */
export type FormFieldTargets = {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => Readonly<Record<string, FormFieldTarget>>
	/** Registers the control id of a field, and returns the function that removes it. */
	register: (name: string, id: string) => () => void
	/** Registers the label text of a control by its id, and returns the function that removes it. */
	registerLabel: (id: string, label: string) => () => void
}

/**
 * A map of counted registrations. Each live registration of a key holds a
 * value, and the last one gives the value of the key.
 *
 * @internal
 */
function createRegistrations() {
	const entries = new Map<string, string[]>()

	return {
		get: (key: string) => entries.get(key)?.at(-1),
		add: (key: string, value: string) => {
			entries.set(key, [...(entries.get(key) ?? []), value])
		},
		/** Removes one registration of `value` under `key`. Returns false when there is none. */
		remove: (key: string, value: string) => {
			const values = entries.get(key) ?? []

			const index = values.lastIndexOf(value)

			if (index === -1) return false

			const rest = values.toSpliced(index, 1)

			if (rest.length > 0) entries.set(key, rest)
			else entries.delete(key)

			return true
		},
		keys: () => entries.keys(),
	}
}

/**
 * Makes the registry of control ids and labels for one form. Each change gives
 * a new snapshot object, so a subscriber renders again only on a change.
 *
 * @remarks A control and its `Message` can register one field with the same
 * id. The registry counts each registration, so the end of one does not remove
 * the other. The last registration of a name gives its id, and the last
 * registration of an id gives its label.
 * @internal
 */
export function createFormFieldTargets(): FormFieldTargets {
	const ids = createRegistrations()

	const labels = createRegistrations()

	let targets: Readonly<Record<string, FormFieldTarget>> = {}

	const { subscribe, emit } = createEmitter()

	/** Writes the target that `name` gives now into `next`, and returns true on a change. */
	function write(next: Record<string, FormFieldTarget>, name: string): boolean {
		const id = ids.get(name)

		const label = id === undefined ? undefined : labels.get(id)

		const current = targets[name]

		if (current?.id === id && current?.label === label) return false

		if (id === undefined) delete next[name]
		else next[name] = label === undefined ? { id } : { id, label }

		return true
	}

	/** Writes the target of each name in `names` into the snapshot, and emits on a change. */
	function publish(names: Iterable<string>) {
		const next = { ...targets }

		let changed = false

		for (const name of names) changed = write(next, name) || changed

		if (!changed) return

		targets = next

		emit()
	}

	/** The names whose registered control id is `id`. */
	function findNames(id: string): string[] {
		return [...ids.keys()].filter((name) => ids.get(name) === id)
	}

	return {
		subscribe,
		getSnapshot: () => targets,
		register: (name, id) => {
			ids.add(name, id)

			publish([name])

			return () => {
				if (ids.remove(name, id)) publish([name])
			}
		},
		registerLabel: (id, label) => {
			labels.add(id, label)

			publish(findNames(id))

			return () => {
				if (labels.remove(id, label)) publish(findNames(id))
			}
		},
	}
}
