import { createEmitter } from '../../utilities'

/**
 * The control ids of the fields of one form, by field name. A control that
 * binds a field registers the id of its control, and so does a form-bound
 * `Message`. A `FormErrorSummary` links each invalid field to that id.
 *
 * @internal
 */
export type FormFieldTargets = {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => Readonly<Record<string, string>>
	/** Registers the control id of a field, and returns the function that removes it. */
	register: (name: string, id: string) => () => void
}

/**
 * Makes the registry of control ids for one form. Each change gives a new
 * snapshot object, so a subscriber renders again only on a change.
 *
 * @remarks A control and its `Message` can register one field with the same
 * id. The registry counts each registration, so the end of one does not remove
 * the other. The last registration of a name gives its id.
 * @internal
 */
export function createFormFieldTargets(): FormFieldTargets {
	// Each live registration of a name, in the order that it came.
	const registrations = new Map<string, string[]>()

	let targets: Readonly<Record<string, string>> = {}

	const { subscribe, emit } = createEmitter()

	/** Writes the id that `name` gives now into the snapshot, and emits on a change. */
	function publish(name: string) {
		const id = registrations.get(name)?.at(-1)

		if (targets[name] === id) return

		const next = { ...targets }

		if (id === undefined) delete next[name]
		else next[name] = id

		targets = next

		emit()
	}

	return {
		subscribe,
		getSnapshot: () => targets,
		register: (name, id) => {
			registrations.set(name, [...(registrations.get(name) ?? []), id])

			publish(name)

			return () => {
				const ids = registrations.get(name) ?? []

				const index = ids.lastIndexOf(id)

				if (index === -1) return

				const rest = ids.toSpliced(index, 1)

				if (rest.length > 0) registrations.set(name, rest)
				else registrations.delete(name)

				publish(name)
			}
		},
	}
}
