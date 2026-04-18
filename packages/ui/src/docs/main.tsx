import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { initialPreload } from './registry'
import './app.css'
import 'maplibre-gl/dist/maplibre-gl.css'

const root = document.getElementById('root')

if (!root) throw new Error('Missing #root element')

// The initial demo import is already in-flight (kicked off at registry
// module-eval time). Wait for it so the first render has the component
// synchronously available — no blank frame.
initialPreload
	.catch(() => {})
	.then(() => {
		createRoot(root).render(
			<StrictMode>
				<App />
			</StrictMode>,
		)
	})
