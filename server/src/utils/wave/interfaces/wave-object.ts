import type { WaveParameters } from './wave-parameters.js';

export interface WaveObject extends WaveParameters {
    pcm: Buffer;
}