import type { Transcription } from './interfaces/index.js';

import { Daemon } from './daemon.js';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

export class InferenceTTS extends EventEmitter<{
    stdout: [ msg: string ];
    stderr: [ msg: string ];
}> {
    #daemon: Daemon;

    get initialized(): boolean {
        return this.#daemon.initialized;
    }

    constructor() {
        super();

        const cwd = resolve(import.meta.dirname, '../../../../inference-tts');
        this.#daemon = new Daemon(cwd);
    }

    initialize(): Promise<void> {
        if (this.#daemon.initialized) {
            throw new Error('The `InferenceTTS` instance is already initialized');
        }

        return new Promise<void>((resolve, reject) => {
            const errorEvent = (err: Error) => {
                this.#daemon.off('stdout', stdoutEvent);
                this.#daemon.off('error', errorEvent);
                reject(err);
            };

            const stdoutEvent = (msg: string) => {
                try {
                    const json = JSON.parse(msg);
                    if (json?.type === 'ready') {
                        this.#daemon.off('stdout', stdoutEvent);
                        this.#daemon.off('error', errorEvent);
                        resolve();
                    }
                } catch {
                    // Nothing xd
                }
            };

            this.#daemon.setMaxListeners(0);
            this.#daemon.on('stdout', stdoutEvent);
            this.#daemon.on('error', errorEvent);

            this.#daemon.on('stdout', msg => this.emit('stdout', msg));
            this.#daemon.on('stderr', msg => this.emit('stderr', msg));
            this.#daemon.initialize();
        });
    }

    synthesize(text: string, outputPath: string, transcription: Transcription): Promise<string> {
        if (!this.#daemon.initialized) {
            throw new Error('The `InferenceTTS` instance must be initialized before synthesizing audio');
        }

        const uuid = randomUUID();
        return new Promise<string>((resolve, reject) => {
            const errorEvent = (err: Error) => {
                this.#daemon.off('stdout', stdoutEvent);
                this.#daemon.off('error', errorEvent);
                reject(err);
            };

            const stdoutEvent = (msg: string) => {
                try {
                    const json = JSON.parse(msg);
                    if (
                        json.uuid === uuid &&
                        json.type === 'output'
                    ) {
                        if (typeof json.path === 'string') {
                            this.#daemon.off('stdout', stdoutEvent);
                            this.#daemon.off('error', errorEvent);
                            resolve(json.path);
                        } else {
                            const error = new Error('The response requires an output path');
                            this.#daemon.emit('error', error);
                        }
                    }
                } catch {
                    // Nothing xd
                }
            };

            this.#daemon.on('stdout', stdoutEvent);
            this.#daemon.on('error', errorEvent);
            this.#daemon.send({
                uuid,
                text,
                lang: transcription.lang,
                ref_text: transcription.text,
                ref_audio: transcription.path,
                output_path: outputPath,
            });
        });
    }

    kill(): Promise<void> {
        if (!this.#daemon.initialized) {
            throw new Error('The `InferenceTTS` instance must be initialized prior to be killed');
        }

        return new Promise<void>((resolve, reject) => {
            const errorEvent = (err: Error) => {
                this.#daemon.off('exit', exitEvent);
                this.#daemon.off('error', errorEvent);
                reject(err);
            };

            const exitEvent = () => {
                this.#daemon.off('exit', exitEvent);
                this.#daemon.off('error', errorEvent);
                resolve();
            };

            this.#daemon.on('exit', exitEvent);
            this.#daemon.on('error', errorEvent);
            this.#daemon.kill();
        });
    }
}
