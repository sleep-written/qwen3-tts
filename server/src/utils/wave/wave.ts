import type { WaveParameters, WaveObject } from './interfaces/index.js';

import { ResamplerVST } from './resampler.vst.js';
import { NormalizeVST } from './normalize.vst.js';

export class Wave implements WaveObject {
    static concat(waves: Wave[]): Wave {
        if (waves.length === 0) return new Wave({ channels: 1, sampleRate: 44100, bitsPerSample: 16 });

        const target: WaveParameters = {
            channels:      Math.max(...waves.map(w => w.channels)),
            sampleRate:    Math.max(...waves.map(w => w.sampleRate)),
            bitsPerSample: Math.max(...waves.map(w => w.bitsPerSample)),
        };

        const resampler = new ResamplerVST(target);
        const pcm = Buffer.concat(waves.map(w => resampler.transform(w).pcm));
        return new Wave(target, pcm);
    }

    static load(raw: Buffer): Wave {
        if (raw.toString('ascii', 0, 4) !== 'RIFF') throw new Error('Not a RIFF file');
        if (raw.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Not a WAVE file');

        let channels: number | undefined;
        let sampleRate: number | undefined;
        let bitsPerSample: number | undefined;
        let pcm: Buffer | undefined;

        let offset = 12;
        while (offset < raw.length - 8) {
            const chunkId   = raw.toString('ascii', offset, offset + 4);
            const chunkSize = raw.readUInt32LE(offset + 4);
            offset += 8;

            if (chunkId === 'fmt ') {
                channels      = raw.readUInt16LE(offset + 2);
                sampleRate    = raw.readUInt32LE(offset + 4);
                bitsPerSample = raw.readUInt16LE(offset + 14);
            } else if (chunkId === 'data') {
                pcm = raw.subarray(offset, offset + chunkSize);
            }

            offset += chunkSize + (chunkSize % 2); // pad to even boundary
        }

        if (channels === undefined || sampleRate === undefined || bitsPerSample === undefined)
            throw new Error('Missing fmt chunk in WAV file');

        return new Wave({ channels, sampleRate, bitsPerSample }, pcm);
    }

    static silence(parameters: WaveParameters, ms: number): Wave {
        const numFrames  = Math.round(parameters.sampleRate * ms / 1000);
        const blockAlign = parameters.channels * (parameters.bitsPerSample / 8);
        const pcm        = Buffer.alloc(numFrames * blockAlign, parameters.bitsPerSample === 8 ? 128 : 0);
        return new Wave(parameters, pcm);
    }

    #pcm: Buffer;
    get pcm(): Buffer {
        return this.#pcm;
    }

    #channels: number;
    get channels(): number {
        return this.#channels;
    }

    #sampleRate: number;
    get sampleRate(): number {
        return this.#sampleRate;
    }

    #bitsPerSample: number;
    get bitsPerSample(): number {
        return this.#bitsPerSample;
    }

    get byteRate(): number {
        return this.#sampleRate * this.#channels * this.#bitsPerSample / 8;
    }

    get blockAlign(): number {
        return this.#channels * this.#bitsPerSample / 8;
    }

    constructor(parameters: WaveParameters, pcm?: Buffer) {
        this.#pcm = pcm ?? Buffer.from([]);
        this.#channels = parameters.channels;
        this.#sampleRate = parameters.sampleRate;
        this.#bitsPerSample = parameters.bitsPerSample;
    }

    resampler(parameters: Partial<WaveParameters>): Wave {
        const vst = new ResamplerVST(parameters);
        const { pcm, channels, sampleRate, bitsPerSample } = vst.transform(this);
        return new Wave({ channels, sampleRate, bitsPerSample }, pcm);
    }

    normalize(): Wave {
        const vst = new NormalizeVST();
        const { pcm, channels, sampleRate, bitsPerSample } = vst.transform(this);
        return new Wave({ channels, sampleRate, bitsPerSample }, pcm);
    }

    build(): Buffer {
        const dataSize = this.#pcm.length;
        const buf = Buffer.alloc(44 + dataSize);

        // RIFF header
        buf.write('RIFF', 0, 'ascii');
        buf.writeUInt32LE(36 + dataSize, 4);
        buf.write('WAVE', 8, 'ascii');

        // fmt chunk
        buf.write('fmt ', 12, 'ascii');
        buf.writeUInt32LE(16, 16);
        buf.writeUInt16LE(1, 20);                        // PCM format
        buf.writeUInt16LE(this.#channels, 22);
        buf.writeUInt32LE(this.#sampleRate, 24);
        buf.writeUInt32LE(this.byteRate, 28);
        buf.writeUInt16LE(this.blockAlign, 32);
        buf.writeUInt16LE(this.#bitsPerSample, 34);

        // data chunk
        buf.write('data', 36, 'ascii');
        buf.writeUInt32LE(dataSize, 40);
        this.#pcm.copy(buf, 44);

        return buf;
    }
}