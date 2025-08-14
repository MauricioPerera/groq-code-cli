import * as path from 'path';
import * as fs from 'fs';

/**
 * Nexus paths resolution utilities
 * Defaults:
 *  - Nexus root: .nexus at project root
 *  - Rules dir:  <NEXUS_ROOT>/rules, fallback read-only: .cursor/rules
 *  - Tasks dir:  <NEXUS_ROOT>/tasks
 */

export function getProjectRoot(): string {
	return process.cwd();
}

export function getNexusRoot(): string {
	const override = process.env.NEXUS_ROOT;
	if (override && override.trim()) {
		return path.isAbsolute(override) ? override : path.resolve(override);
	}
	return path.resolve(getProjectRoot(), '.nexus');
}

export function getNexusRulesDir(): string {
	const override = process.env.NEXUS_RULES_DIR;
	if (override && override.trim()) {
		return path.isAbsolute(override) ? override : path.resolve(override);
	}
	return path.join(getNexusRoot(), 'rules');
}

export function getCursorRulesFallbackDir(): string {
	return path.resolve(getProjectRoot(), '.cursor', 'rules');
}

export function getNexusTasksDir(): string {
	return path.join(getNexusRoot(), 'tasks');
}

export function getNexusMcpConfig(): string {
	return path.join(getNexusRoot(), 'mcp.servers.json');
}

export function ensureDirExists(dirPath: string): void {
	try {
		fs.mkdirSync(dirPath, { recursive: true });
	} catch {
		// ignore
	}
}

export function resolveFirstExistingDir(candidateDirs: string[]): string | null {
	for (const dir of candidateDirs) {
		try {
			if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
				return dir;
			}
		} catch {
			continue;
		}
	}
	return null;
}


