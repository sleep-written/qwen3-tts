from ndjson_cli import CLI
cli = CLI()
cli.send('Initializing program')

import torch
from argv import Argv
from qwen_asr import Qwen3ASRModel


cli.send('Loading qwen3-asr model')
argv = Argv().parse()
model = Qwen3ASRModel.from_pretrained(
    'Qwen/Qwen3-ASR-1.7B',
    dtype=torch.bfloat16,
    device_map='cuda:0',

    # Batch size limit for inference. -1 means unlimited. Smaller values can help avoid OOM.
    max_inference_batch_size=argv.batchSizeLimit,

    # Maximum number of tokens to generate. Set a larger value for long audio input.
    max_new_tokens=argv.maxNewTokens,
)

cli.send('Transcribing audio file')
results = model.transcribe(
    audio=str(argv.input),
    language=argv.language,
)

cli.send('The audio has been transcribed sucessfully', {
    'language': results[0].language,
    'text': results[0].text
})