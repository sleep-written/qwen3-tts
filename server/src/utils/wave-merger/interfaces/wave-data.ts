export interface WaveData {
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
    pcm: Buffer;
}