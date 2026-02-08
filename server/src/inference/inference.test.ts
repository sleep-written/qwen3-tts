import { Inference } from './inference.ts';
import { resolve } from 'node:path';
import test from 'node:test';

test('Check inference', async (t: test.TestContext) => {
    const location = resolve(
        import.meta.dirname,
        '../../../inference-tts'
    );

    const inference = new Inference(location);
    const data: Array<unknown> = [];

    inference.onMessage(json => data.push(json));
    
    try {
        await inference.execute([]);
        throw new Error('This must be fail!');
    } catch {
        const errors = data.filter((value) => value instanceof Error) as Error[];
        t.assert.ok(errors.length > 0);
        t.assert.ok(errors.every((error) => typeof error.stack === 'string'));
    }
});
