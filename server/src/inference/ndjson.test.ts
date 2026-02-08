import type { NDJSONData } from './ndjson-data.ts';
import { NDJSON } from './ndjson.ts';
import test from 'node:test';

test('Basic ndjson simulation', (t: test.TestContext) => {
    const data: NDJSONData[] = [];
    const ndJSON = new NDJSON();

    return new Promise<void>((resolve, reject) => {
        try {
            ndJSON.on('message', json => data.push(json));
            ndJSON.on('close', () => {
                t.assert.strictEqual(data.length, 3);

                t.assert.strictEqual(data[0].type, 'standard');
                t.assert.strictEqual(data[0].message, 'foo');
                t.assert.strictEqual(
                    data[0].date.getTime(),
                    new Date(Date.UTC(2026, 0, 1)).getTime()
                );

                t.assert.strictEqual(data[1].type, 'standard');
                t.assert.strictEqual(data[1].message, 'bar');
                t.assert.strictEqual(
                    data[1].date.getTime(),
                    new Date(Date.UTC(2026, 0, 2)).getTime()
                );

                t.assert.strictEqual(data[2].type, 'garbage');
                t.assert.strictEqual(data[2].message, 'Raw line detected, cannot be parsed as JSON');
                t.assert.strictEqual(data[2].payload, 'caca');

                resolve();
            });

            ndJSON.push(JSON.stringify({
                type: 'standard' as NDJSONData['type'],
                date: new Date(Date.UTC(2026, 0, 1)),
                message: 'foo'
            }) + '\n');
            
            ndJSON.push(JSON.stringify({
                type: 'standard' as NDJSONData['type'],
                date: new Date(Date.UTC(2026, 0, 2)),
                message: 'bar'
            }) + '\n');
            
            ndJSON.push('caca');

            ndJSON.close();
        } catch (err) {
            reject(err);
        }
    });
});