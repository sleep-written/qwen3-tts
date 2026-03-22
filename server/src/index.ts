import { resolve } from 'node:path';
import { TTS } from './tts.js';

const audioInput = resolve(import.meta.dirname, '../../frieren.mp3');
const tts = new TTS(audioInput);

console.info('Loading models...');
await tts.initialize();

console.info('Transcribing text...');
await tts.synthesize(
    resolve('./output.wav'),
    `Infancia
No se sabe a ciencia cierta los orígenes de este gordo cabrón. Algunos expertos en el tema afirman que Mario fue llevado por la cigüeña junto a su hermano Luigi para recompensar a Miyamoto y su esposa por tener una gran noche de sexo. Sin embargo, una vieja tortuga de nombre Kamek usa sus poderes de Lord Voldemort para arrojar al bebé Mario a una isla de unas lagartijas llamadas Yoshis. De ahí los videojuegos de la saga Yoshi’s Island, juegos de los que no se acuerda ni dios.
Otra versión es la que aparece en los dibujos animados que hicieron sobre Mario en los Años 90. Al parecer Mario era un fontanero barriobajero de origen siciliano que vivía en un apartamento cutre de Brooklyn que compartía con su hermano Luigi. Un buen día, este par de retrasados, probablemente bajo los efectos del vino barato, fueron absorbidos por una tubería que les llevó a un mundo mágico conocido como Reino Champiñón.

Primeros empleos
Debido a que Mario tenía una adicción a quedarse en la casa de sus padres mirando TV y comiendo pizza mustachole, su padre enojado lo hecho junto a su hermano donde debían trabajar. Es entonces que le regalaron unas zapatillas Nike Air Force© para poder saltar más alto y no se cansara tan pronto. Al saltar tan alto sufrió un accidente sufriendo una enfermedad de salvaprincesarositis. Al principio esos síntomas no se sentían de manera notable y consiguió un empleo de carpintero. Luego escuchó un grito de una mujer rosada. A partir de ahora los síntomas han aparecido, subió a una escaleras esquivando barriles de cerveza y dio mazazos a un gorila con corbata partiendole los dientes. Estos hechos han asustado a la mujer porque explicó que le estaba masajeando al gorila. Finalmente han detenido a Mario y Donkey Kong fue trasladado a su hábitat natural.`
);

console.info('Closing tasks...');
await tts.kill();