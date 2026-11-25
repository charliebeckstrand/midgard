import { loadGridEditing } from '../../modules/grid/grid-data'
import { loadGridDataDialogs } from '../../modules/grid/grid-data-dialogs'
import { loadGridReorderKit } from '../../modules/grid/grid-region'

// The grid loads its dialogs on the first open, its drag and drop module as a
// grid that takes a reorder mounts, and its editing layer as an editable grid
// mounts. The `unit` and `docs` projects share one module registry across the
// files of a worker, and `sequence.shuffle` decides which case is the first to
// need a module. The load before the cases gives each case the state of a page
// that already loaded them, so a case that reads an open dialog, drags, or
// edits at once does not depend on the order. The load runs after
// `module-mocks.ts`, so the grid loads against the mocks. The `integration`
// project mocks modules per file, so it runs no such load.
//
// The `docs` project runs this file as a setup file. In `unit`, each test file
// whose imports reach a grid loader imports this file first
// (`grid-preload-boundary.test.ts`). A setup file is not the place in `unit`:
// Vitest runs each file of a project when the import graph of a setup file
// reaches a changed file, and the grid reaches about half of the source. A
// one-line edit of `Kbd` then ran all 505 files of `unit` in `test:changed`,
// and 133 without this file in the setup.
//
// The load is a top-level await, not a `beforeAll`. It is an import, as the
// static imports above are, and an import has no time limit. On a cold module
// cache, the compiled run (`vitest.compiler.config.ts`) transforms the grid for
// the first file of each worker, and that took more than the hook limit.
await Promise.all([loadGridDataDialogs(), loadGridReorderKit(), loadGridEditing()])
