import { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';

export class Daemon extends EventEmitter<{
    stdout: [ message: string ];
    stderr: [ message: string ];
}> {
    #path: string;
    #task?: ChildProcess;

    get running(): boolean {
        return !!this.#task;
    }

    constructor(path: string) {
        super();
        this.#path = path;
    }

    run(): void {
        if (this.#task) {
            throw new Error('The process is already running');
        }

        const exec = resolve(this.#path, './.venv/bin/python');
        const file = resolve(this.#path, './main.py');
        this.#task = spawn(exec, [ file ], {
            env: {
                ...process.env,
                // PYTHONUNBUFFERED: '1',
                // TQDM_DISABLE: '0'
            }
        });

        this.#task.stdout?.on('data', stream => {
            const text: string = Buffer.isBuffer(stream)
            ?   Buffer.from(stream).toString('utf-8')
            :   stream;

            for (const line of text.split('\n')) {
                const trimmed = line.trim();
                if (trimmed) this.emit('stdout', trimmed);
            }
        });

        this.#task.stderr?.on('data', stream => {
            const text: string = Buffer.isBuffer(stream)
            ?   Buffer.from(stream).toString('utf-8')
            :   stream;

            for (const line of text.split('\n')) {
                const trimmed = line.trim();
                if (trimmed) this.emit('stderr', trimmed);
            }
        });
    }

    kill(): void {
        if (!this.#task) {
            throw new Error('The process is not running');
        }

        this.#task.stdout?.removeAllListeners();
        this.#task.stderr?.removeAllListeners();
        this.#task.removeAllListeners();
        this.#task.kill();
        this.#task = undefined;
    }

    send(data: string): void {
        if (!this.#task) {
            throw new Error('The process is not running');
        }

        this.#task.stdin?.write(data + '\n');
    }
}