import { StackedLayout, StackedLayoutBody } from 'ui/layouts'
import { FRAME_ID } from '../../utilities/frame'
import type { GameSettings } from '../../utilities/settings'
import { GameBoard } from '../game-board'
import { GameSettingsProvider } from '../game-settings'
import { NumbersHeader } from '../numbers-header'

/** Props for {@link GameFrame}. */
export type GameFrameProps = {
	/** The seed of the run. */
	seed: string
	/** The settings of the cookies of the request. */
	settings: GameSettings
	/** Plays against the CPU: the page of a `/vs` address. */
	vsCpu?: boolean
}

/**
 * The page of a run: the header, and the game in the body, under the settings
 * of the request. The column has the
 * height of the viewport, and the body scrolls under the header, so the
 * document is never taller than the screen (see `StackedLayout`). Share
 * screenshot draws this box ({@link FRAME_ID}).
 */
export function GameFrame({ seed, settings, vsCpu }: GameFrameProps) {
	return (
		<GameSettingsProvider settings={settings}>
			<StackedLayout id={FRAME_ID} className="h-dvh print:h-auto">
				<NumbersHeader />

				<StackedLayoutBody>
					<GameBoard seed={seed} vsCpu={vsCpu} />
				</StackedLayoutBody>
			</StackedLayout>
		</GameSettingsProvider>
	)
}
