import { beforeAll } from 'vitest'
import { loadGridDataDialogs } from '../../modules/grid/grid-data-dialogs'
import { loadGridReorderKit } from '../../modules/grid/grid-region'

// The grid loads its dialogs on the first open, and its drag and drop module as
// a grid that takes a reorder mounts. The `unit` project shares one module
// registry across the files of a worker, and `sequence.shuffle` decides which
// case is the first to need a module. The load before each file gives each case
// the state of a page that already loaded them, so a case that reads an open
// dialog or drags at once does not depend on the order. This file runs after
// `module-mocks.ts`, so the grid loads against the mocks. The `integration`
// project mocks modules per file, so it runs no such load.
beforeAll(() => Promise.all([loadGridDataDialogs(), loadGridReorderKit()]))
