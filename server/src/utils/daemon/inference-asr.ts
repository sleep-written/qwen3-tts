import type { Transcription } from './interfaces/index.js';

import { Daemon } from './daemon.js';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import EventEmitter from 'node:events';

export class InferenceASR extends EventEmitter<{
    stdout: [ msg: string ];
    stderr: [ msg: string ];
}> {
    #daemon: Daemon;

    constructor() {
        super();
        
        const cwd = resolve(import.meta.dirname, '../../../../inference-asr');
        this.#daemon = new Daemon(cwd);
    }

    initialize(): Promise<void> {
        if (this.#daemon.initialized) {
            throw new Error('The `InferenceASR` instance is already initialized');
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

            this.#daemon.on('stdout', stdoutEvent);
            this.#daemon.on('error', errorEvent);

            this.#daemon.on('stdout', msg => this.emit('stdout', msg));
            this.#daemon.on('stderr', msg => this.emit('stderr', msg));
            this.#daemon.initialize();
        });
    }

    transcribe(path: string, lang?: string): Promise<Transcription> {
        if (!this.#daemon.initialized) {
            throw new Error('The `InferenceASR` instance must be initialized before to transcribe audio files');
        }

        const uuid = randomUUID();
        return new Promise<Transcription>((resolve, reject) => {
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
                        if (
                            typeof json.text === 'string' &&
                            typeof json.lang === 'string'
                        ) {
                            this.#daemon.off('stdout', stdoutEvent);
                            this.#daemon.off('error', errorEvent);
                            resolve({
                                text: json.text,
                                lang: json.lang
                            });
                        } else {
                            const error = new Error(`The response requires an output text and a detected language`);
                            this.#daemon.emit('error', error);
                        }
                    }
                } catch {
                    // Nothing xd
                }
            };

            this.#daemon.on('stdout', stdoutEvent);
            this.#daemon.on('error', errorEvent);
            this.#daemon.send({ uuid, path, lang });
        });
    }

    kill(): Promise<void> {
        if (!this.#daemon.initialized) {
            throw new Error('The `InferenceASR` instance must be initialized prior to be killed');
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
            }

            this.#daemon.on('exit', exitEvent);
            this.#daemon.on('error', errorEvent);
            this.#daemon.kill();
        });
    }
}