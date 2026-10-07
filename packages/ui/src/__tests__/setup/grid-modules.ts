import { beforeAll } from 'vitest'

// The grid loads its dialogs on the first open, and its drag and drop module as
// a grid that takes a reorder mounts. The `unit` project shares one module
// registry across the files of a worker, and `sequence.shuffle` decides which
// case is the first to need a module. The load before each file gives each case
// the state of a page that already loaded them, so a case that reads an open
// dialog or drags at once does not depend on the order. The `integration`
// project mocks modules per file, so it runs no such load. The imports are
// dynamic, so the module mocks of the setup are in place first.
beforeAll(async () => {
	const [dialogs, region] = await Promise.all([
		import('../../modules/grid/grid-data-dialogs'),
		import('../../modules/grid/grid-region'),
	])

	await Promise.all([dialogs.loadGridDataDialogs(), region.loadGridReorderKit()])
})
