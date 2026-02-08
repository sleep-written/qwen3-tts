import type { NDJSONData } from './ndjson-data.ts';
import { EventEmitter } from 'node:events';

export class NDJSON extends EventEmitter<{
    message:    [value: NDJSONData];
    close:      [];
}> {
    #data = '';

    constructor() {
        super();
    }

    #parse(line: string): NDJSONData {
        if (!line.trim()) {
            return {
                type: 'raw',
                date: new Date(),
                message: '',
            };
        }

        try {
            const json = JSON.parse(line) as any;
            const rawType = json?.type;
            const type: NDJSONData['type'] =
                rawType === 'standard' ||
                rawType === 'system'   ||
                rawType === 'stderr'   ||
                rawType === 'warning'  ||
                rawType === 'log'      ||
                rawType === 'error'
                ?   rawType
                :   'raw';

            let date = typeof json?.date === 'string'
            ?   new Date(json.date)
            :   new Date();

            if (Number.isNaN(date.getTime())) {
                date = new Date();
            }

            const message = typeof json?.message === 'string'
            ?   json.message
            :   '';

            const out: NDJSONData = { type, date, message };
            if (json && Object.prototype.hasOwnProperty.call(json, 'payload')) {
                out.payload = json.payload;
            }

            return out;
        } catch {
            return {
                type: 'raw',
                date: new Date(),
                message: line
            };
        }
    }

    #emitMessages(): void {
        while (true) {
            const eol = this.#data.indexOf('\n');
            if (eol >= 0) {
                const line = this.#data.slice(0, eol);
                this.#data = this.#data.slice(eol + 1);
                this.emit('message', this.#parse(line));
            } else {
                break;
            }
        }
    }

    push(v: string): void;
    push(v: Buffer, encoding: BufferEncoding): void;
    push(v: Buffer | string, encoding?: BufferEncoding): void {
        const chunk = Buffer.isBuffer(v)
        ?   v.toString(encoding ?? 'utf-8')
        :   v;

        this.#data += chunk
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        this.#emitMessages();
    }

    close(): void {
        this.#emitMessages();
        if (this.#data.length > 0) {
            this.emit('message', this.#parse(this.#data));
            this.#data = '';
        }
        this.emit('close');
    }
}