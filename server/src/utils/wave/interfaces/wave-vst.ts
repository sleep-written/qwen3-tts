import type { WaveObject } from './wave-object.js';

export interface WaveVST {
    transform(input: WaveObject): WaveObject;
}