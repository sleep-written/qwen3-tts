import { resolve } from 'node:path';
import { InferenceASR } from './utils/daemon/index.js';

const inferenceASR = new InferenceASR();

console.info('Loading inference model...');
await inferenceASR.initialize();

const [ frieren, coco ] = await Promise.all([
    (() => {
        console.info('Transcribing "frieren.mp3"...');
        return inferenceASR.transcribe(resolve(
            import.meta.dirname,
            '../../frieren.mp3'
        ));
    })(),
    (() => {
        console.info('Transcribing "coco.mp3"...');
        return inferenceASR.transcribe(resolve(
            import.meta.dirname,
            '../../coco.mp3'
        ));
    })()
]);

console.log('frieren message:', frieren);
console.log('coco message:', coco);
await inferenceASR.kill();