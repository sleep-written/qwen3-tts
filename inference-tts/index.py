from ndjson_cli import CLI
cli = CLI()

import torch
import soundfile as sf
from argv import Argv
from qwen_tts import Qwen3TTSModel

cli.send('Initializing program')
argv = Argv().parse()

cli.send('Loading qwen3-tts model')
model = Qwen3TTSModel.from_pretrained(
    'Qwen/Qwen3-TTS-12Hz-1.7B-Base',
    device_map='cuda:0',
    dtype=torch.bfloat16,
    # attn_implementation='flash_attention_2',
)

refAudio = argv.refAudio
if refAudio:
    refAudio = str(refAudio.absolute())

cli.send('Generating audio file')
wavs, sr = model.generate_voice_clone(
    text=argv.prompt,
    language=argv.language,
    ref_audio=refAudio,
    ref_text=argv.refText,
)

cli.send('Writing file into filesystem')
sf.write(str(argv.output), wavs[0], sr)

cli.send('File generated sucessfully', {
    'path': str(argv.output)
})