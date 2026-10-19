import { installConsoleGuard } from '../helpers/console-guard'

// Each project with a setup runs this file, so a test fails on a message that
// it does not expect. See `helpers/console-guard.ts`.
installConsoleGuard()
