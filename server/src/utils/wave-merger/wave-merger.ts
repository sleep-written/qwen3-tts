import type { WaveData } from './interfaces/index.js';
import { readFile, rm, writeFile } from 'node:fs/promises';

export class WaveMerger {
    #paths: string[] = [];

    constructor(paths: string[]) {
        this.#paths = paths;
    }

    async #parseWav(path: string): Promise<WaveData> {
        // fmt chunk
        const buffer        = await readFile(path);
        const channels      = buffer.readUInt16LE(22);
        const sampleRate    = buffer.readUInt32LE(24);
        const bitsPerSample = buffer.readUInt16LE(34);

        // Find the data chunk (it may not start at byte 36)
        let offset = 12;
        while (offset < buffer.length - 8) {
            const id   = buffer.toString('ascii', offset, offset + 4);
            const size = buffer.readUInt32LE(offset + 4);

            if (id === 'data') {
                const pcm = buffer.subarray(offset + 8, offset + 8 + size);
                return {
                    pcm,
                    channels,
                    sampleRate,
                    bitsPerSample,
                };
            }

            offset += 8 + size;
        }

        throw new Error('No data chunk found in WAV file');
    }

    #buildWav(wav: WaveData): Buffer {
        const { channels, sampleRate, bitsPerSample, pcm } = wav;
        const byteRate   = sampleRate * channels * bitsPerSample / 8;
        const blockAlign = channels * bitsPerSample / 8;

        const header = Buffer.allocUnsafe(44);
        header.write('RIFF', 0, 'ascii');
        header.writeUInt32LE(36 + pcm.length, 4);
        header.write('WAVE', 8, 'ascii');
        header.write('fmt ', 12, 'ascii');
        header.writeUInt32LE(16, 16);           // PCM chunk size
        header.writeUInt16LE(1, 20);            // PCM format
        header.writeUInt16LE(channels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36, 'ascii');
        header.writeUInt32LE(pcm.length, 40);

        return Buffer.concat([ header, pcm ]);
    }

    async merge(path: string): Promise<void> {
        if (this.#paths.length === 0) {
            throw new Error(`No files attached to merge`);
        }

        const files = await Promise.all(this.#paths.map(x => this.#parseWav(x)));
        const { channels, sampleRate, bitsPerSample } = files[0];
        const pcm = Buffer.concat(files.map(w => w.pcm));
        const out = this.#buildWav({
            pcm,
            channels,
            sampleRate,
            bitsPerSample,
        });

        await writeFile(path, out);
        await Promise.all(this.#paths.map(x => rm(x)));
        this.#paths = [];
    }
}