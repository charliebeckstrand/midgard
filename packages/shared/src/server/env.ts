// The environment of the server of an app image (`serve-next.ts`). This is
// the one file of the server that reads or writes `process.env`.

/** The settings of the server, from the variables that the image sets. */
export type ServerEnv = {
	/** `PORT`, else 3000. */
	port: number
	/** `HOSTNAME`, else `0.0.0.0`. */
	hostname: string
	/** `KEEP_ALIVE_TIMEOUT` in ms, else `undefined` for the default of Node. */
	keepAliveTimeout: number | undefined
}

/** Reads the settings of the server, as the `server.js` of Next does. */
export function readServerEnv(): ServerEnv {
	const keepAlive = Number.parseInt(process.env.KEEP_ALIVE_TIMEOUT ?? '', 10)

	return {
		port: Number.parseInt(process.env.PORT ?? '', 10) || 3000,
		hostname: process.env.HOSTNAME || '0.0.0.0',
		keepAliveTimeout: Number.isFinite(keepAlive) && keepAlive >= 0 ? keepAlive : undefined,
	}
}

/**
 * Sets the variables that Next reads at the start, as the `server.js` of Next
 * does: production mode, and the config of the build, `conf`.
 */
export function writeNextEnv(conf: Record<string, unknown>): void {
	// The types of Next make `NODE_ENV` read-only, so the write goes through `Object.assign`.
	Object.assign(process.env, {
		NODE_ENV: 'production',
		__NEXT_PRIVATE_STANDALONE_CONFIG: JSON.stringify(conf),
	})
}
