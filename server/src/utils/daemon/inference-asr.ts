import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { Daemon } from './daemon.js';
import { randomUUID } from 'node:crypto';

export interface DaemonObject {
    on  (name: 'stdout', c: (m: string) => void): void;
    off (name: 'stdout', c: (m: string) => void): void;
    once(name: 'stdout', c: (m: string) => void): void;

    on  (name: 'stderr', c: (m: string) => void): void;
    off (name: 'stderr', c: (m: string) => void): void;
    once(name: 'stderr', c: (m: string) => void): void;

    get running(): boolean;

    run (): void;
    kill(): void;
    send(message: string): void;
    removeAllListeners(): void;
}

export class InferenceAsr extends EventEmitter<{
    stdout: [ message: string ];
    stderr: [ message: string ];
}> {
    #daemon: DaemonObject;

    get running(): boolean {
        return this.#daemon.running;
    }

    constructor(daemon?: DaemonObject) {
        super();
        this.#daemon = daemon ?? new Daemon(resolve(
            import.meta.dirname,
            '../../../../inference-asr'
        ));
    }

    async run(): Promise<void> {
        if (this.#daemon.running) {
            throw new Error(`The inference-asr is already running`);
        }

        return new Promise<void>((resolve, reject) => {
            const stdoutCallback = (m: string): void => {
                try {
                    const json = JSON.parse(m);
                    if (json?.type === 'ready') {
                        this.#daemon.off('stdout', stdoutCallback);
                        this.#daemon.off('stderr', stderrCallback);
                        resolve();
                    }
                } catch (err) {
                    return;
                }
            };

            const stderrCallback = (m: string): void => {
                try {
                    const json = JSON.parse(m);
                    if (json?.type === 'error' && typeof json?.message === 'string') {
                        this.#daemon.off('stdout', stdoutCallback);
                        this.#daemon.off('stderr', stderrCallback);
                        reject(new Error(json.message));
                    }
                } catch {
                    return;
                }
            };

            this.#daemon.on('stdout', stdoutCallback);
            this.#daemon.on('stderr', stderrCallback);
            this.#daemon.on('stdout', m => this.emit('stdout', m));
            this.#daemon.on('stderr', m => this.emit('stderr', m));

            try {
                this.#daemon.run();
            } catch (err) {
                this.#daemon.removeAllListeners();
                reject(err);
            }
        });
    }

    async transcribe(path: string, lang?: string): Promise<{ text: string; lang: string; }> {
        return new Promise((resolve, reject) => {
            const uuid = randomUUID();
            const callback = (m: string): void => {
                try {
                    const json = JSON.parse(m);
                    if (
                        typeof json?.uuid === 'string' &&
                        typeof json?.text === 'string' &&
                        typeof json?.lang === 'string' &&
                        json.uuid === uuid
                    ) {
                        this.#daemon.off('stdout', callback);
                        const { text, lang } = json;
                        resolve({ text, lang });
                    }
                } catch {
                    return;
                }
            };

            const stderrCallback = (m: string): void => {
                try {
                    const json = JSON.parse(m);
                    if (json?.uuid === uuid && typeof json?.message === 'string') {
                        this.#daemon.off('stdout', callback);
                        this.#daemon.off('stderr', stderrCallback);
                        reject(new Error(json.message));
                    }
                } catch {
                    return;
                }
            };

            try {

                const text = JSON.stringify({ uuid, path, lang });
                this.#daemon.on('stdout', callback);
                this.#daemon.on('stderr', stderrCallback);
                this.#daemon.send(text);

            } catch (err) {
                this.#daemon.off('stdout', callback);
                this.#daemon.off('stderr', stderrCallback);
                reject(err);
            }
        });
    }

    kill(): void {
        this.#daemon.kill();
    }
}