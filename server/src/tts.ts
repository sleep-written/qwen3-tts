import { InferenceASR, InferenceTTS } from './utils/daemon/index.js';
import { WaveMerger } from './utils/wave-merger/index.js';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';

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

    async synthesize(outputPath: string, texts: string[]): Promise<void> {
        if (!this.initialized) {
            throw new Error(`The TTS instance must be initialized prior to synthetize audio`);
        }

        const transcription = await this.#inferenceASR.transcribe(this.#inputPath);
        const paths = await Promise.all(texts
            .map(text => ({ text, uuid: randomUUID() }))
            .map(({ text, uuid }) => ({ text,  path: `${tmpdir()}/output-${uuid}.wav` }))
            .map(({ text, path }) => this.#inferenceTTS
                .synthesize(text, path, transcription)
                .then(x => {
                    console.info(`File "${x}" ready!`);
                    return x;
                })
            )
        );

        const merger = new WaveMerger(paths);
        await merger.merge(outputPath);
    }
}