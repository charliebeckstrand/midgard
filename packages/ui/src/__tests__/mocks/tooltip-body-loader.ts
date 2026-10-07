type Loader = typeof import('../../components/tooltip/tooltip-body-loader')

type Body = Awaited<ReturnType<Loader['loadTooltipBody']>>

/**
 * The tooltip body loader for the `floating-ui` browser project. It loads the
 * real module, as the real loader does, and adds a hold that a case can set.
 * The real loader keeps the module for the life of the page, so a case could
 * not see a tooltip before the load. With the hold, a case renders a tooltip
 * that has no state, gives a first intent, and then releases the load.
 */
let body: Body | null = null

let pending: Promise<Body> | null = null

let gate: Promise<void> = Promise.resolve()

let open = () => {}

const listeners = new Set<() => void>()

function loadTooltipBody(): Promise<Body> {
	pending ??= gate
		.then(() => import('../../components/tooltip/tooltip-body'))
		.then((module) => {
			body = module

			for (const listener of listeners) listener()

			return module
		})

	return pending
}

/**
 * The hold of the mocked loader. `hold` forgets the loaded module and holds the
 * next load until `release`.
 * @internal
 */
export const tooltipLoad = {
	hold() {
		body = null

		pending = null

		gate = new Promise((resolve) => {
			open = resolve
		})
	},
	release() {
		open()
	},
}

/** The mocked module, with the exports of the real loader. @internal */
export default async function mockTooltipBodyLoader(
	importOriginal: () => Promise<Loader>,
): Promise<Loader> {
	const real = await importOriginal()

	return {
		...real,
		loadTooltipBody,
		preloadTooltipBody: () => void loadTooltipBody(),
		subscribeTooltipBody: (listener) => {
			listeners.add(listener)

			return () => {
				listeners.delete(listener)
			}
		},
		readTooltipBody: () => body,
	}
}
