from output_channel import OutputChannel
events = OutputChannel()

from pathlib import Path
from asr import ASR

def main():
    events.emit('main', 'Loading qwen3-asr model...')
    asr = ASR()

    events.emit('main', 'Transcripting audio file...')
    out = asr.transcribe(
        path=Path('../frieren.mp3').resolve()
    )

    events.emit('output', 'Transcription complete', {
        'path': str(out.path),
        'text': out.text,
        'lang': out.lang
    })

if __name__ == "__main__":
    main()
