import type { WaveVST, WaveObject, WaveParameters } from './interfaces/index.js';

export class ResamplerVST implements WaveVST {
    #parameters: Partial<WaveParameters>;

    constructor(parameters: Partial<WaveParameters>) {
        this.#parameters = parameters;
    }

    transform(input: WaveObject): WaveObject {
        const target: WaveParameters = {
            channels:      this.#parameters.channels      ?? input.channels,
            sampleRate:    this.#parameters.sampleRate    ?? input.sampleRate,
            bitsPerSample: this.#parameters.bitsPerSample ?? input.bitsPerSample,
        };

        const frames  = this.#decode(input);
        const chaned  = this.#convertChannels(frames, input.channels, target.channels);
        const timed   = this.#convertSampleRate(chaned, input.sampleRate, target.sampleRate);
        const pcm     = this.#encode(timed, target.bitsPerSample);

        return { ...target, pcm };
    }

    // -------------------------------------------------------------------------
    // Decode: PCM buffer → float64 frames [ frame[channel] ]
    // -------------------------------------------------------------------------

    #decode(input: WaveObject): number[][] {
        const bytesPerSample = input.bitsPerSample / 8;
        const blockAlign     = input.channels * bytesPerSample;
        const numFrames      = input.pcm.length / blockAlign;

        return Array.from({ length: numFrames }, (_, i) =>
            Array.from({ length: input.channels }, (_, c) =>
                this.#readSample(input.pcm, i * blockAlign + c * bytesPerSample, input.bitsPerSample)
            )
        );
    }

    #readSample(buf: Buffer, offset: number, bitsPerSample: number): number {
        switch (bitsPerSample) {
            case 8:  return (buf.readUInt8(offset) - 128) / 128;
            case 16: return buf.readInt16LE(offset) / 32768;
            case 24: return ((buf.readInt8(offset + 2) << 16) | buf.readUInt16LE(offset)) / 8388608;
            case 32: return buf.readInt32LE(offset) / 2147483648;
            default: throw new Error(`Unsupported bitsPerSample: ${bitsPerSample}`);
        }
    }

    // -------------------------------------------------------------------------
    // Channel conversion
    // -------------------------------------------------------------------------

    #convertChannels(frames: number[][], from: number, to: number): number[][] {
        if (from === to) return frames;

        if (to === 1)
            return frames.map(f => [f.reduce((a, b) => a + b, 0) / f.length]);

        if (from === 1)
            return frames.map(f => Array(to).fill(f[0]));

        throw new Error(`Channel conversion from ${from} to ${to} is not supported`);
    }

    // -------------------------------------------------------------------------
    // Sample rate conversion: linear interpolation between frames
    // -------------------------------------------------------------------------

    #convertSampleRate(frames: number[][], from: number, to: number): number[][] {
        if (from === to || frames.length === 0) return frames;

        const targetLength = Math.round(frames.length * to / from);

        return Array.from({ length: targetLength }, (_, i) => {
            const srcPos = targetLength > 1 ? i * (frames.length - 1) / (targetLength - 1) : 0;
            const lo     = Math.floor(srcPos);
            const frac   = srcPos - lo;
            const a      = frames[lo];
            const b      = frames[Math.min(lo + 1, frames.length - 1)];
            return a.map((s, c) => s + (b[c] - s) * frac);
        });
    }

    // -------------------------------------------------------------------------
    // Encode: float64 frames → PCM buffer
    // -------------------------------------------------------------------------

    #encode(frames: number[][], bitsPerSample: number): Buffer {
        const channels       = frames[0]?.length ?? 0;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign     = channels * bytesPerSample;
        const buf            = Buffer.alloc(frames.length * blockAlign);

        for (let i = 0; i < frames.length; i++)
            for (let c = 0; c < channels; c++)
                this.#writeSample(buf, i * blockAlign + c * bytesPerSample, frames[i][c], bitsPerSample);

        return buf;
    }

    #writeSample(buf: Buffer, offset: number, value: number, bitsPerSample: number): void {
        const v = Math.max(-1, Math.min(1, value));
        switch (bitsPerSample) {
            case 8:  buf.writeUInt8(Math.round(v * 127) + 128, offset); break;
            case 16: buf.writeInt16LE(Math.round(v * 32767), offset); break;
            case 24: {
                const i24 = Math.round(v * 8388607);
                buf.writeUInt8( i24         & 0xff, offset);
                buf.writeUInt8((i24 >>  8)  & 0xff, offset + 1);
                buf.writeUInt8((i24 >> 16)  & 0xff, offset + 2);
                break;
            }
            case 32: buf.writeInt32LE(Math.round(v * 2147483647), offset); break;
            default: throw new Error(`Unsupported bitsPerSample: ${bitsPerSample}`);
        }
    }
}
