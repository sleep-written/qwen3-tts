import { resolve } from 'node:path';
import { InferenceAsr } from './utils/daemon/index.js';

const inferenceAsr = new InferenceAsr();

try {
    console.log('Loading model...');
    await inferenceAsr.run();
    
    console.log('Transcribing audio...');
    const out = await Promise.all([
        inferenceAsr.transcribe(resolve('../frieren.mp3')),
        inferenceAsr.transcribe(resolve('../coco.mp3'))
    ])

    console.log(out);

} catch (err) {
    console.error(err);

} finally {
    if (inferenceAsr.running) {
        inferenceAsr.kill();
    }
}
