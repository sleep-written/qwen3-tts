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

                t.assert.strictEqual(data[2].type, 'raw');
                t.assert.strictEqual(data[2].message, 'caca');

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

test('JSON split across two chunks', (t: test.TestContext) => {
    const data: NDJSONData[] = [];
    const ndJSON = new NDJSON();

    return new Promise<void>((resolve, reject) => {
        try {
            ndJSON.on('message', json => data.push(json));
            ndJSON.on('close', () => {
                t.assert.strictEqual(data.length, 1);
                t.assert.strictEqual(data[0].type, 'standard');
                t.assert.strictEqual(data[0].message, 'split message');
                t.assert.strictEqual(
                    data[0].date.getTime(),
                    new Date(Date.UTC(2026, 0, 15)).getTime()
                );

                resolve();
            });

            const jsonString = JSON.stringify({
                type: 'standard' as NDJSONData['type'],
                date: new Date(Date.UTC(2026, 0, 15)),
                message: 'split message'
            }) + '\n';

            // Split the JSON string in half
            const mid = Math.floor(jsonString.length / 2);
            const firstHalf = jsonString.substring(0, mid);
            const secondHalf = jsonString.substring(mid);

            // Push each half separately
            ndJSON.push(firstHalf);
            ndJSON.push(secondHalf);

            ndJSON.close();
        } catch (err) {
            reject(err);
        }
    });
});

