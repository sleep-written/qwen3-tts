from pathlib import Path
from qwen_asr import Qwen3ASRModel
from dataclasses import dataclass
from typing import TypedDict, NotRequired

class QueueItem(TypedDict):
    path: Path
    lang: NotRequired[str]

@dataclass
class Transcription:
    path: Path
    text: str
    lang: str

def transcribe(
    model: Qwen3ASRModel,
    queue: list[QueueItem],
) -> list[Transcription]:
    output = list[Transcription]()
    for item in queue:
        path = item.get('path')
        results = model.transcribe(
            audio=str(path),
            language=item.get('lang'), # set "English" to force the language
        )
        
        output.append(Transcription(
            path,
            text = results[0].text,
            lang = results[0].language
        ))

    return output