import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { initialApiPreload, initialPreload } from './registry'
import './app.css'

const root = document.getElementById('root')

if (!root) throw new Error('Missing #root element')

// The initial demo and its API reference are already in-flight (kicked off at
// registry module-eval time). Wait for both so the first render has everything
// synchronously available — no blank frame, no Spinner.
Promise.all([initialPreload, initialApiPreload])
	.catch(() => {})
	.then(() => {
		createRoot(root).render(
			<StrictMode>
				<App />
			</StrictMode>,
		)
	})
