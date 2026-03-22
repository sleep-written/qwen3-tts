import sys
import json
import soundfile
from tts import TTS
from pathlib import Path
from dataclasses import dataclass

@dataclass
class JSONRequest:
    uuid: str
    text: str
    lang: str
    ref_text: str
    ref_audio: str
    output_path: str


tts = TTS()
print(
    json.dumps(
        { 'type': 'ready' },
        ensure_ascii=False
    ),
    flush=True
)

while True:
    line = sys.stdin.readline()
    if not line:
        break

    line = str.strip(line)
    msg: JSONRequest = json.loads(
        line,
        object_hook=lambda o: JSONRequest(
            uuid=o['uuid'],
            text=o['text'],
            lang=o['lang'],
            ref_text=o['ref_text'],
            ref_audio=o['ref_audio'],
            output_path=o['output_path'],
        )
    )

    res = tts.synthesize(
        text=msg.text,
        ref_audio=Path(msg.ref_audio),
        ref_text=msg.ref_text,
        language=msg.lang,
    )

    soundfile.write(msg.output_path, res.wave, res.sr)
    print(
        json.dumps(
            {
                'uuid': msg.uuid,
                'type': 'output',
                'path': msg.output_path,
            },
            ensure_ascii=False
        ),
        flush=True
    )
