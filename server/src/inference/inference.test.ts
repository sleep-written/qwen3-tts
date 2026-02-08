import type { NDJSONData } from './ndjson-data.ts';
import { Inference } from './inference.ts';
import { resolve } from 'node:path';
import test from 'node:test';

test('Check inference', async (t: test.TestContext) => {
    const location = resolve(
        import.meta.dirname,
        '../../../inference-tts'
    );

    const inference = new Inference(location);
    const data: NDJSONData[] = [];

    inference.onMessage(json => data.push(json));
    
    try {
        await inference.execute([]);
        throw new Error('This must be fail!');
    } catch {
        t.assert.deepStrictEqual(data.map(x => x.message), [
            '',
            '********',
            'Warning: flash-attn is not installed. Will only run the manual PyTorch version. Please install flash-attn for faster inference.',
            '********',
            '',
            'Initializing program',
            'usage: index.py [-h] [--ref-audio REF_AUDIO] [--ref-text REF_TEXT]',
            '                [--language LANGUAGE]',
            '                output prompt',
            'index.py: error: the following arguments are required: output, prompt',
        ]);
    }
});