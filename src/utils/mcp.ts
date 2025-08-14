import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getNexusRoot, getNexusMcpConfig } from './nexus-paths.js';

type Json = any;

interface McpServerConfig {
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
}

interface JsonRpcRequest {
	jsonrpc: '2.0';
	method: string;
	params?: Json;
	id: number;
}

interface JsonRpcResponse {
	jsonrpc: '2.0';
	result?: Json;
	error?: { code: number; message: string; data?: Json };
	id: number;
}

class MessageFramer {
	private buffer: Buffer = Buffer.alloc(0);
	private pending: Array<(msg: any) => void> = [];

	constructor(private onMessage: (msg: any) => void) {}

	public push(chunk: Buffer) {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		while (true) {
			const sepIndex = this.buffer.indexOf('\r\n\r\n');
			if (sepIndex === -1) return;
			const header = this.buffer.slice(0, sepIndex).toString('utf8');
			const match = /Content-Length:\s*(\d+)/i.exec(header);
			if (!match) {
				// Drop invalid header
				this.buffer = this.buffer.slice(sepIndex + 4);
				continue;
			}
			const length = parseInt(match[1], 10);
			const total = sepIndex + 4 + length;
			if (this.buffer.length < total) return;
			const body = this.buffer.slice(sepIndex + 4, total).toString('utf8');
			this.buffer = this.buffer.slice(total);
			try {
				const msg = JSON.parse(body);
				this.onMessage(msg);
			} catch {
				// ignore parse errors
			}
		}
	}

	public static encode(message: any): Buffer {
		const json = JSON.stringify(message);
		const header = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n`;
		return Buffer.concat([Buffer.from(header, 'utf8'), Buffer.from(json, 'utf8')]);
	}
}

class McpClient {
	private proc: ChildProcessWithoutNullStreams | null = null;
	private nextId = 1;
	private pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

	constructor(private config: McpServerConfig) {}

	public async start(): Promise<void> {
		if (this.proc) return;
		const proc = spawn(this.config.command, this.config.args || [], {
			cwd: this.config.cwd || process.cwd(),
			env: { ...process.env, ...(this.config.env || {}) },
		});
		this.proc = proc;
		const framer = new MessageFramer((msg) => this.handleMessage(msg));
		proc.stdout.on('data', (d) => framer.push(Buffer.from(d)));
		proc.stderr.on('data', () => {});
		proc.on('exit', () => {
			this.proc = null;
			this.pending.forEach(p => p.reject(new Error('MCP server exited')));
			this.pending.clear();
		});
	}

	private handleMessage(msg: any) {
		if (msg && typeof msg.id === 'number') {
			const waiter = this.pending.get(msg.id);
			if (waiter) {
				this.pending.delete(msg.id);
				if (msg.error) waiter.reject(new Error(msg.error.message || 'MCP error'));
				else waiter.resolve(msg.result);
			}
		}
	}

	public async request(method: string, params?: Json, timeoutMs = 15000): Promise<any> {
		if (!this.proc) throw new Error('MCP server not started');
		const id = this.nextId++;
		const req: JsonRpcRequest = { jsonrpc: '2.0', method, params, id };
		const buf = MessageFramer.encode(req);
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.proc!.stdin.write(buf);
			const t = setTimeout(() => {
				if (this.pending.has(id)) {
					this.pending.delete(id);
					reject(new Error('MCP request timed out'));
				}
			}, timeoutMs);
			// Clear timeout on settle
			const originalResolve = resolve;
			const originalReject = reject;
			resolve = (v) => { clearTimeout(t); originalResolve(v); };
			reject = (e) => { clearTimeout(t); originalReject(e); };
		});
	}

	public async listTools(): Promise<Array<{ name: string; description?: string; inputSchema?: any }>> {
		// Try several common method names for MCP tool listing
		const candidates = ['tools/list', 'list_tools', 'tools.list'];
		for (const m of candidates) {
			try {
				const res = await this.request(m, undefined, 8000);
				if (!res) continue;
				if (Array.isArray(res)) return res;
				if (Array.isArray(res.tools)) return res.tools;
				if (res.result && Array.isArray(res.result.tools)) return res.result.tools;
			} catch {
				continue;
			}
		}
		return [];
	}

	public async callTool(toolName: string, args: any): Promise<any> {
		const candidates = ['tools/call', 'call_tool', 'tools.call'];
		for (const m of candidates) {
			try {
				const res = await this.request(m, { name: toolName, arguments: args }, 15000);
				if (res && res.result !== undefined) return res.result;
				return res;
			} catch {}
		}
		throw new Error('MCP server does not support tool invocation');
	}
}

export class McpManager {
	private static _instance: McpManager;
	private clients = new Map<string, McpClient>();
	private config: McpServerConfig[] = [];
	private toolsByServer = new Map<string, Array<{ name: string; description?: string; inputSchema?: any }>>();

	private constructor() {
		this.loadConfig();
	}

	public static instance(): McpManager {
		if (!this._instance) this._instance = new McpManager();
		return this._instance;
	}

	private loadConfig() {
		try {
			const file = getNexusMcpConfig();
			if (fs.existsSync(file)) {
				const txt = fs.readFileSync(file, 'utf8');
				this.config = JSON.parse(txt);
			}
		} catch {}
	}

	public listConfigured(): string[] {
		return this.config.map(c => c.name);
	}

	public async connect(name: string): Promise<void> {
		const existing = this.clients.get(name);
		if (existing) return;
		const cfg = this.config.find(c => c.name === name);
		if (!cfg) throw new Error(`MCP server not configured: ${name}`);
		const client = new McpClient(cfg);
		await client.start();
		this.clients.set(name, client);
		// Try initialize handshake (best-effort)
		try {
			await client.request('initialize', { protocolVersion: '2024-11-05', capabilities: {} }, 5000);
		} catch {}

		// Discover tools on connect (best-effort)
		try {
			const tools = await client.listTools();
			this.toolsByServer.set(name, tools);
		} catch {}
	}

	public async request(name: string, method: string, params?: Json): Promise<any> {
		const client = this.clients.get(name);
		if (!client) throw new Error(`MCP server not connected: ${name}`);
		return client.request(method, params);
	}

	public async ensureConnectedAll(): Promise<void> {
		await Promise.all(this.config.map(c => this.connect(c.name).catch(() => {})));
	}

	public getDiscoveredTools(): Array<{ server: string; name: string; description?: string; inputSchema?: any }> {
		const out: Array<{ server: string; name: string; description?: string; inputSchema?: any }> = [];
		for (const [server, tools] of this.toolsByServer.entries()) {
			for (const t of tools) {
				const anyT: any = t as any;
				const inputSchema = (t as any).inputSchema ?? anyT.parameters ?? anyT.schema;
				out.push({ server, name: t.name, description: t.description, inputSchema });
			}
		}
		return out;
	}

	public async call(server: string, toolName: string, args: any): Promise<any> {
		const client = this.clients.get(server);
		if (!client) throw new Error(`MCP server not connected: ${server}`);
		return client.callTool(toolName, args);
	}
}


