import { configure } from '@testing-library/react'
import { inject } from 'vitest'

declare module 'vitest' {
	interface ProvidedContext {
		asyncUtilTimeout: number
	}
}

// The budget of `waitFor` and `findBy` comes from the shared config
// (`vitest.shared.mts`), which sets it with `testTimeout` for the speed of the
// machine.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })
