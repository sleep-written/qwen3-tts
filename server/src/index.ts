import { resolve } from 'path';
import { InferenceTTS } from './inference/index.ts';

const tts = new InferenceTTS();
const { path } = await tts.execute(
    resolve(import.meta.dirname, '../output.wav'),
    'No cojudo, lo videos están puestos como: "solo para suscriptores"!!!. De pago, ni Fernanfloo pudo ponerlo. O sea, tu "queridísimo amigo chileno" no pudo jajaja!',
    {
        refText: 'puede mejorar en algunas áreas, pero podría decirse que ya es una verdadera maga. Me engañaste, Haïta. ¿Quieres ir por algo dulce de comer? Qué astuto te has vuelto.',
        refAudio: resolve(import.meta.dirname, '../input.mp3'),
        language: 'Spanish',
        onMessage: o => {
            if (o.type !== 'raw') {
                console.log('[python]:', o.message);
            }
        }
    }   
);

console.log(`[result]: "${path}"`);