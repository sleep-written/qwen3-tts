import { resolve } from 'node:path';
import { TTS } from './tts.js';

const audioInput = resolve(import.meta.dirname, '../../frieren.mp3');
const tts = new TTS(audioInput);

console.info('Loading models...');
await tts.initialize();

console.info('Transcribing text...');
await tts.synthesize(
    resolve('./output.wav'),
    [
        `Sonic The Hedgehog es un videojuego clásico y multipremiado conocido por ser el primer juego de la saga de Sonic The Hedgehog, cuyo protagonista es un erizo azul llamado Sonic The Hedgehog (increíble la creatividad de los nombres).`,
        `Fue lanzado en 1991 por la empresa japonesa SEGA, en su afán de desbancar a Nintendo del podio de los videojuegos, algo que Sega pudo lograr gracias a éste juego de Sonic y sus posteriores secuelas, pero que después la cagaron por arruinar su propia franquicia y por eso Nintendo volvió a tener protagonismo y Sega mas bien se fue por el caño (aunque ahora a los dos los cagaron Sony y Microsoft),`,
        `pero en aquella época clásica de los años 90 Sonic era el Dios de los Videojuegos y por eso su primer título marcó un hito en toda la Historia de los videojuegos.`
    ]
);

console.info('Closing tasks...');
await tts.kill();