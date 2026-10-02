import { type ComponentType, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppearanceProvider } from '../../providers/appearance'

// The fixture sheets: each file under `sheets/` exports one `Sheet`. The id of
// a sheet is its file name. `#<id>` shows that sheet. With no hash, the page
// lists a link to each sheet, and `visual.ts` reads the list.
const sheets = Object.fromEntries(
	Object.entries(
		import.meta.glob<ComponentType>('./sheets/*.tsx', { eager: true, import: 'Sheet' }),
	).map(([path, Sheet]) => [path.slice('./sheets/'.length, -'.tsx'.length), Sheet]),
)

const root = document.getElementById('root')

if (!root) throw new Error('fixtures: missing #root element')

const Sheet = sheets[location.hash.slice(1)]

createRoot(root).render(
	<StrictMode>
		<AppearanceProvider>
			{Sheet ? (
				<Sheet />
			) : (
				<ul data-slot="fixture-index">
					{Object.keys(sheets).map((id) => (
						<li key={id}>
							<a href={`#${id}`}>{id}</a>
						</li>
					))}
				</ul>
			)}
		</AppearanceProvider>
	</StrictMode>,
)
