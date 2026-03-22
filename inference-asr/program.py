import sys
import json
from asr import ASR
from typing import Optional
from pathlib import Path
from dataclasses import dataclass

@dataclass
class JSONRequest:
    path: str
    uuid: str
    lang: Optional[str]


asr = ASR()
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
            path=o['path'],
            uuid=o['uuid'],
            lang=o.get('lang', None)
        )
    )

    res = asr.transcribe(
        Path(msg.path),
        msg.lang
    )
    
    print(
        json.dumps(
            {
                'uuid': msg.uuid,
                'type': 'output',
                'text': res.text,
                'lang': res.lang
            },
            ensure_ascii=False
        ),
        flush=True
    )