import { installFetchGuard } from '../helpers/fetch-guard'

// Each jsdom project runs this file, so a test fails when it fetches a URL that
// is not local. See `helpers/fetch-guard.ts`.
installFetchGuard()
