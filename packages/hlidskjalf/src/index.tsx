import { render } from 'ink'

import { App } from './app.js'
import type { Options, SortOrder } from './types.js'

function parseArgs(argv: string[]): Options {
	const root = process.cwd()
	const filter: string[] = []
	const exclude: string[] = []
	let order: SortOrder = 'alphabetical'
	let title = 'hlidskjalf'
	let emoji = '\u{1F3D4}'

	for (const arg of argv) {
		if (arg.startsWith('--filter=')) {
			const value = arg.slice('--filter='.length).replace(/^\{(.+)\}$/, '$1')
			filter.push(value)
		}

		if (arg.startsWith('--exclude=')) {
			exclude.push(arg.slice('--exclude='.length))
		}

		if (arg.startsWith('--order=')) {
			const value = arg.slice('--order='.length)
			if (value === 'run' || value === 'alphabetical') order = value
		}

		if (arg.startsWith('--title=')) {
			title = arg.slice('--title='.length)
		}

		if (arg.startsWith('--emoji=')) {
			emoji = arg.slice('--emoji='.length)
		}
	}

	return {
		root,
		order,
		title,
		emoji,
		filter: filter.length > 0 ? filter : undefined,
		exclude: exclude.length > 0 ? exclude : undefined,
	}
}

const { waitUntilExit } = render(<App options={parseArgs(process.argv.slice(2))} />, {
	exitOnCtrlC: false,
})

await waitUntilExit()

process.exit(0)
