import type { NDJSONData } from './ndjson-data.ts';
import { resolve } from 'path';
import { NDJSON } from './ndjson.ts';
import { spawn } from 'node:child_process';

export class Inference {
    #ndJson = new NDJSON();

    #path: string;
    get path(): string {
        return this.#path;
    }

    onMessage(callback: (o: NDJSONData) => unknown): void {
        this.#ndJson.on('message', callback);
    }

    offMessage(callback: (o: NDJSONData) => unknown): void {
        this.#ndJson.off('message', callback);
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