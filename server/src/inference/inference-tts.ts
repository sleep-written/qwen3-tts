import type { NDJSONData } from './ndjson-data.ts';
import { Inference } from './inference.ts';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface InferenceTTSResponse {
    path: string;
    data: Buffer;
}

export class InferenceTTS {
    #location = resolve(
        import.meta.dirname,
        '../../../inference-tts'
    );

    constructor() {
        this.#location = resolve(
            import.meta.dirname,
            '../../../inference-tts'
        );
    }

    execute(
        output: string,
        prompt: string,
        options?: {
            onMessage?(o: NDJSONData): unknown;
            language?: string;
            refAudio?: string;
            refText?: string;
        }
    ): Promise<InferenceTTSResponse> {
        const flags: Record<string, string> = {};
        if (options?.language) {
            flags['--language'] = options.language;
        }
        
        if (options?.refAudio) {
            flags['--ref-audio'] = options.refAudio;
        }
        
        if (options?.refText) {
            flags['--ref-text'] = options.refText;
        }

        return new Promise<InferenceTTSResponse>(async (resolve, reject) => {
            try {
                const inference = new Inference(this.#location);
                let response: InferenceTTSResponse | undefined;

                inference.onMessage(async o => {
                    options?.onMessage?.(o);
                    if (typeof o.payload?.path === 'string') {
                        const path = o.payload.path;
                        const data = await readFile(path);
                        response = { path, data };
                    }
                });

                await inference.execute([ output, prompt ], flags);
                if (response) {
                    resolve(response);
                } else {
                    throw new Error('No audio file has been generated');
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}