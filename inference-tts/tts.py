import torch
from numpy import ndarray
from pathlib import Path
from qwen_tts import Qwen3TTSModel
from dataclasses import dataclass

@dataclass
class Synthesis:
    sr: int
    wave: ndarray

class TTS:
    def __init__(self) -> None:
        self.model = Qwen3TTSModel.from_pretrained(
            "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
            device_map="cuda:0",
            dtype=torch.bfloat16,
            # attn_implementation="flash_attention_2",
        )

    def synthesize(self, text: str, ref_audio: Path, ref_text: str, language: str) -> Synthesis:
        wavs, sr = self.model.generate_voice_clone(
            text=text,
            ref_audio=str(ref_audio),
            ref_text=ref_text,
            language=language,
        )

        return Synthesis(
            sr=sr,
            wave=wavs[0],
        )