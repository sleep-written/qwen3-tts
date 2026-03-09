import torch
from typing import Optional
from pathlib import Path
from qwen_asr import Qwen3ASRModel
from dataclasses import dataclass

@dataclass
class Transcription:
    path: Path
    text: str
    lang: str

class ASR:
    def __init__(self) -> None:
        self.model = Qwen3ASRModel.from_pretrained(
            "Qwen/Qwen3-ASR-1.7B",
            dtype=torch.bfloat16,
            device_map="cuda:0",
            # attn_implementation="flash_attention_2",
            max_inference_batch_size=32, # Batch size limit for inference. -1 means unlimited. Smaller values can help avoid OOM.
            max_new_tokens=256, # Maximum number of tokens to generate. Set a larger value for long audio input.
        )

    def transcribe(self, path: Path, lang: Optional[str] = None) -> Transcription:
        results = self.model.transcribe(
            audio=str(path),
            language=lang, # set "English" to force the language
        )

        return Transcription(
            path,
            text=results[0].text,
            lang=results[0].language
        )