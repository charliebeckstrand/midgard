import { type ChildProcess, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'

import { parseLine, stripAnsi } from './parser.js'
import type { Process, Status, Workspace } from './types.js'

const MAX_LOGS = 500

interface RunnerEvents {
	change: []
}

export interface Runner extends EventEmitter<RunnerEvents> {
	list(): Process[]
	get(name: string): Process | undefined
	start(workspaces: Workspace[]): Promise<void>
	shutdown(): Promise<void>
}

const LOG_ERROR_RECOVERY_MS = 5000

class ProcessRunner extends EventEmitter<RunnerEvents> implements Runner {
	private children = new Map<string, ChildProcess>()

	private state = new Map<string, Process>()

	private logErrorTimers = new Map<string, ReturnType<typeof setTimeout>>()
	private lastGoodStatus = new Map<string, Status>()

	private root: string

	private stopping = false

	constructor(root: string) {
		super()

		this.root = root
	}

	list(): Process[] {
		return [...this.state.values()]
	}

	get(name: string): Process | undefined {
		return this.state.get(name)
	}

	async start(workspaces: Workspace[]): Promise<void> {
		const packages = workspaces.filter((w) => w.kind === 'package')
		const apps = workspaces.filter((w) => w.kind === 'app')

		// Seed all entries as pending
		for (const workspace of workspaces) {
			this.state.set(workspace.name, { workspace, status: 'pending', logs: [] })
		}

		// Packages first — apps may depend on their build output
		for (const workspace of packages) {
			this.spawn(workspace)
		}

		if (packages.length > 0) {
			await this.waitForPackages(packages.map((p) => p.name))
		}

		for (const workspace of apps) {
			this.spawn(workspace)
		}
	}

	private waitForPackages(names: string[]): Promise<void> {
		const remaining = new Set(names)

		return new Promise((resolve) => {
			const check = () => {
				for (const name of [...remaining]) {
					const s = this.state.get(name)?.status

					if (s === 'watching' || s === 'error') remaining.delete(name)
				}

				if (remaining.size === 0) {
					this.off('change', check)

					resolve()
				}
			}

			this.on('change', check)

			check()
		})
	}

	private spawn(workspace: Workspace): void {
		const child = spawn('pnpm', ['--filter', workspace.name, 'run', 'dev'], {
			cwd: this.root,
			stdio: 'pipe',
			env: { ...process.env, FORCE_COLOR: '1' },
		})

		this.children.set(workspace.name, child)

		this.setStatus(workspace.name, 'building')

		const onData = (data: Buffer) => {
			for (const raw of data.toString().split('\n')) {
				const line = raw.trimEnd()

				if (!line) continue

				const proc = this.state.get(workspace.name)

				if (!proc) continue

				proc.logs.push(line)

				if (proc.logs.length > MAX_LOGS) {
					proc.logs = proc.logs.slice(-MAX_LOGS)
				}

				const parsed = parseLine(stripAnsi(line))

				if (parsed.status) {
					if (parsed.status === 'error') {
						this.scheduleLogErrorRecovery(workspace.name)
					} else {
						this.lastGoodStatus.set(workspace.name, parsed.status)

						this.clearLogErrorTimer(workspace.name)
					}
					this.setStatus(workspace.name, parsed.status)
				}
				if (parsed.url) proc.url = parsed.url

				this.emit('change')
			}
		}

		child.stdout?.on('data', onData)
		child.stderr?.on('data', onData)

		child.on('close', (code) => {
			if (!this.stopping) {
				this.setStatus(workspace.name, code === 0 ? 'stopped' : 'error')
			}
		})

		child.on('error', () => this.setStatus(workspace.name, 'error'))
	}

	private scheduleLogErrorRecovery(name: string): void {
		const existing = this.logErrorTimers.get(name)

		if (existing) clearTimeout(existing)

		const timer = setTimeout(() => {
			this.logErrorTimers.delete(name)

			const proc = this.state.get(name)

			if (proc?.status === 'error') {
				this.setStatus(name, this.lastGoodStatus.get(name) ?? 'ready')
			}
		}, LOG_ERROR_RECOVERY_MS)

		this.logErrorTimers.set(name, timer)
	}

	private clearLogErrorTimer(name: string): void {
		const timer = this.logErrorTimers.get(name)

		if (timer) {
			clearTimeout(timer)

			this.logErrorTimers.delete(name)
		}
	}

	private setStatus(name: string, status: Status): void {
		const proc = this.state.get(name)

		if (!proc) return

		proc.status = status

		this.emit('change')
	}

	async shutdown(): Promise<void> {
		this.stopping = true

		for (const timer of this.logErrorTimers.values()) {
			clearTimeout(timer)
		}

		this.logErrorTimers.clear()

		const waiting: Promise<void>[] = []

		for (const [, child] of this.children) {
			waiting.push(
				new Promise((resolve) => {
					child.on('close', () => resolve())

					child.kill('SIGTERM')

					setTimeout(() => {
						if (!child.killed) child.kill('SIGKILL')
					}, 5000)
				}),
			)
		}

		await Promise.all(waiting)
	}
}

export function createRunner(root: string): Runner {
	return new ProcessRunner(root)
}
