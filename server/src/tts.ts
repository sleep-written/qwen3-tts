import { readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';

import { InferenceASR, InferenceTTS } from './utils/daemon/index.js';
import { Wave } from './utils/wave/index.js';

export class TTS {
    #inputPath: string;
    #inferenceASR = new InferenceASR();
    #inferenceTTS = new InferenceTTS();

    get initialized(): boolean {
        return this.#inferenceASR.initialized || this.#inferenceTTS.initialized;
    }

    constructor(inputPath: string) {
        this.#inputPath = inputPath;
    }

    initialize(): Promise<void[]> {
        return Promise.all([
            this.#inferenceASR.initialize(),
            this.#inferenceTTS.initialize(),
        ]);
    }

    kill(): Promise<void[]> {
        return Promise.all([
            this.#inferenceASR.kill(),
            this.#inferenceTTS.kill(),
        ]);
    }

    async synthesize(outputPath: string, text: string): Promise<void> {
        if (!this.initialized) {
            throw new Error(`The TTS instance must be initialized prior to synthetize audio`);
        }

        const parts = text
            .replace(/[ \t]+/g, ' ')
            .replace(/\n+/g, '\n')
            .replace(/(?<=[^\.])\n/g, '.\n')
            .split(/(?!<=\.)(?<=\.)(?: +|(?=\n))/)
            .map(p => p.trimEnd());
        
        const transcription = await this.#inferenceASR.transcribe(this.#inputPath);
        const waves = await Promise.all(parts
            .map(text => ({ text, uuid: randomUUID() }))
            .map(({ text, uuid }) => ({ text,  path: `${tmpdir()}/output-${uuid}.wav` }))
            .map(({ text, path }) => this.#inferenceTTS
                .synthesize(text.trim(), path, transcription)
                .then(async x => {
                    console.info(`File "${x}" ready!`);
                    const data = await readFile(x);
                    await rm(x);

                    const wave = Wave.load(data);
                    return text.startsWith('\n')
                    ?   Wave.concat([ Wave.silence(wave, 500), wave ])
                    :   wave;
                })
            )
        );

        const wave = Wave.concat(waves);
        await writeFile(outputPath, wave.build());
    }
}