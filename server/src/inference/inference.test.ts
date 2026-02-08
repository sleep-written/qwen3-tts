import type { NDJSONData } from './ndjson-data.ts';
import { Inference } from './inference.ts';
import { resolve } from 'node:path';
import test from 'node:test';

test('Check inference', async (t: test.TestContext) => {
    const location = resolve(import.meta.dirname, '../../../inference-tts');
    const inference = new Inference(location);
    const data: NDJSONData[] = [];

    inference.onMessage(json => {
        if (json.type !== 'raw') {
            data.push(json);
        }
    });
    
    try {
        await inference.execute(
            [
                resolve(import.meta.dirname, '../../output.wav'),
                'tengo tremendo retraso mental...'
            ],
            {
                '--ref-audio': resolve(import.meta.dirname, '../../input.mp3'),
                '--ref-text': 'puede mejorar en algunas áreas, pero podría decirse que ya es una verdadera maga. Me engañaste, Haïta. ¿Quieres ir por algo dulce de comer? Qué astuto te has vuelto.',
                '--language': 'Spanish'
            }
        );
        throw new Error('This must be fail!');
    } catch {
        t.assert.deepStrictEqual(data.map(x => x.message), [
            'Initializing program',
            'Loading qwen3-tts model',
            'Generating audio file',
            'Writing file into filesystem',
            'File generated sucessfully'
        ]);
    }
});