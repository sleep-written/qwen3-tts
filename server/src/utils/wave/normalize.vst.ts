import type { WaveVST, WaveObject } from './interfaces/index.js';

export class NormalizeVST implements WaveVST {
    transform(input: WaveObject): WaveObject {
        const bytesPerSample = input.bitsPerSample / 8;
        const blockAlign     = input.channels * bytesPerSample;
        const numFrames      = input.pcm.length / blockAlign;

        // Decode all samples to float64
        const samples: number[] = [];
        for (let i = 0; i < numFrames; i++)
            for (let c = 0; c < input.channels; c++)
                samples.push(this.#readSample(input.pcm, i * blockAlign + c * bytesPerSample, input.bitsPerSample));

        // Find peak amplitude
        const peak = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);

        // Nothing to do if silent or already at full scale
        if (peak === 0 || peak === 1) return input;

        // Scale all samples so the peak hits 1.0
        const gain = 1 / peak;
        const pcm  = Buffer.alloc(input.pcm.length);

        for (let i = 0; i < numFrames; i++)
            for (let c = 0; c < input.channels; c++)
                this.#writeSample(pcm, i * blockAlign + c * bytesPerSample, samples[i * input.channels + c] * gain, input.bitsPerSample);

        return { ...input, pcm };
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

    #writeSample(buf: Buffer, offset: number, value: number, bitsPerSample: number): void {
        const v = Math.max(-1, Math.min(1, value));
        switch (bitsPerSample) {
            case 8:  buf.writeUInt8(Math.round(v * 127) + 128, offset); break;
            case 16: buf.writeInt16LE(Math.round(v * 32767), offset); break;
            case 24: {
                const i24 = Math.round(v * 8388607);
                buf.writeUInt8( i24        & 0xff, offset);
                buf.writeUInt8((i24 >>  8) & 0xff, offset + 1);
                buf.writeUInt8((i24 >> 16) & 0xff, offset + 2);
                break;
            }
            case 32: buf.writeInt32LE(Math.round(v * 2147483647), offset); break;
            default: throw new Error(`Unsupported bitsPerSample: ${bitsPerSample}`);
        }
    }
}