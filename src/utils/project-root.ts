import * as fs from 'fs';
import * as path from 'path';

function hasRepoMarkers(dir: string): boolean {
	try {
		const entries = new Set(fs.readdirSync(dir));
		return entries.has('.git') || entries.has('package.json') || entries.has('tsconfig.json') || entries.has('.nexus');
	} catch {
		return false;
	}
}

export function detectProjectRoot(startDir?: string): string {
	const override = process.env.NEXUS_PROJECT_ROOT;
	if (override && override.trim()) {
		return path.isAbsolute(override) ? override : path.resolve(override);
	}
	let current = path.resolve(startDir || process.cwd());
	while (true) {
		if (hasRepoMarkers(current)) return current;
		const parent = path.dirname(current);
		if (parent === current) {
			return path.resolve(startDir || process.cwd());
		}
		current = parent;
	}
}

export function resolveAtProjectRoot(p: string): string {
	if (!p || path.isAbsolute(p)) return p;
	const root = detectProjectRoot();
	return path.join(root, p);
}


