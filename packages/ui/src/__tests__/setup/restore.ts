import { afterEach } from 'vitest'
import { restoreTestState } from '../helpers/restore-test-state'

// The node projects (`pure` and `geometry`) run no jsdom setup, so this hook
// gives them the restore of `setup/index.ts` after each test.
afterEach(restoreTestState)
