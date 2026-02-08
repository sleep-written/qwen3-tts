import type { NDJSONData } from './ndjson-data.ts';
import { resolve } from 'path';
import { NDJSON } from './ndjson.ts';
import { spawn } from 'node:child_process';

export class Inference {
    #ndJson = new NDJSON();
    #messageHandlers = new Map<
        (o: NDJSONData | Error) => unknown,
        (o: NDJSONData) => void
    >();

    #path: string;
    get path(): string {
        return this.#path;
    }

    onMessage(callback: (o: NDJSONData | Error) => unknown): void {
        const handler = (data: NDJSONData): void => {
            if (data.type === 'stderr') {
                const error = new Error(data.message);
                error.stack = data.message;
                callback(error);
                return;
            }

            callback(data);
        };

        this.#messageHandlers.set(callback, handler);
        this.#ndJson.on('message', handler);
    }

    offMessage(callback: (o: NDJSONData | Error) => unknown): void {
        const handler = this.#messageHandlers.get(callback);
        if (!handler) {
            return;
        }

        this.#ndJson.off('message', handler);
        this.#messageHandlers.delete(callback);
    }

    constructor(path: string) {
        this.#path = path;
    }

    execute(args: string[], flags?: Record<string, string>): Promise<void> {
        const pythonExec = resolve(this.#path, 'venv/bin/python');
        const targetScript = resolve(this.#path, 'index.py');
        const spawnArgs = [targetScript, ...args];
        
        if (flags) {
            Object.entries(flags).forEach(([key, value]) => {
                spawnArgs.push(`${key}=${value}`);
            });
        }

        const task = spawn(pythonExec, spawnArgs, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        return new Promise<void>((resolve, reject) => {
            task.stdout?.on('data', (chunk) => {
                this.#ndJson.push(chunk);
            });

            task.stderr?.on('data', (chunk) => {
                this.#ndJson.push(chunk);
            });

            task.on('error', (error) => {
                this.#ndJson.close();
                reject(error);
            });

            task.on('close', (code) => {
                this.#ndJson.close();
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Python process exited with code ${code}`));
                }
            });
        });
    }
}
