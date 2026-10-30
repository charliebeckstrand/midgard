import { animate } from 'motion'
import { onTestFinished, vi } from 'vitest'

/**
 * Makes the shared `animate` spy (`mocks/motion.ts`) run no animation for the
 * current case. The spy gives an empty control. Use it for a case on the fake
 * clock. There, a real animation waits on a fake frame, and the frame loop of
 * Motion stays stuck for the next files of the worker (`isolate: false`).
 *
 * `clearMocks` keeps the implementation of the spy, so the stub removes itself
 * when the case finishes, also after a timeout. The spy then calls the real
 * `animate` again.
 */
export function stubAnimate(): void {
	vi.mocked(animate).mockReturnValue({} as ReturnType<typeof animate>)

	onTestFinished(() => {
		vi.mocked(animate).mockRestore()
	})
}
