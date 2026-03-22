import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

export class Daemon extends EventEmitter<{
    stdout: [ message: string ];
    stderr: [ message: string ];
    error:  [ error: Error ];
    exit:   [ code: number | null ];
}> {
    #cwd: string;
    #task?: ChildProcessWithoutNullStreams;

    get initialized(): boolean {
        return typeof this.#task !== 'undefined';
    }

    constructor(cwd: string) {
        super();
        this.#cwd = cwd;
    }

    initialize(): void {
        if (this.#task) {
            throw new Error(`The daemon is already initialized`);
        }

        const venv = resolve(this.#cwd, '.venv/bin/python');
        const exec = resolve(this.#cwd, 'program.py');
        this.#task = spawn(venv, [ exec ], {
            stdio: [ 'pipe', 'pipe', 'pipe' ],
            env: {
                ...process.env
            }
        });

        this.#task.on('error', err => {
            this.emit('error', err);
        });

        this.#task.once('exit', code => {
            this.#task?.removeAllListeners();
            this.emit('exit', code);
        });

        this.#task.stdout.on('data', (chunk: Buffer | string) => {
            const text = Buffer.isBuffer(chunk)
            ?   chunk.toString('utf-8').trim()
            :   chunk.trim();

            this.emit('stdout', text);
        });

        this.#task.stderr.on('data', (chunk: Buffer | string) => {
            const text = Buffer.isBuffer(chunk)
            ?   chunk.toString('utf-8').trim()
            :   chunk.trim();

            this.emit('stdout', text);
        });
    }

    send(data: Record<string, any>): void {
        if (!this.#task) {
            throw new Error(`The daemon must be initialized before to send messages`);
        }

        const text = JSON.stringify(data);
        this.#task.stdin.write(text + '\n');
    }

    kill(): void {
        if (!this.#task) {
            throw new Error(`The daemon must be initialized before to kill`);
        }

        this.#task.kill();
    }
}