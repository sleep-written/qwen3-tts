from typing import Optional
from pathlib import Path
from argparse import ArgumentParser
from dataclasses import dataclass

@dataclass
class ArgvData:
    output: Path
    prompt: str
    refText: Optional[str]
    refAudio: Optional[Path]
    language: str

class Argv:
    def __init__(self):
        self.parser = ArgumentParser()
        self.parser.add_argument(
            'output',
            type=Path
        )

        self.parser.add_argument(
            'prompt',
            type=str
        )

        self.parser.add_argument(
            '--ref-audio',
            type=Path
        )

        self.parser.add_argument(
            '--ref-text',
            type=str
        )

        self.parser.add_argument(
            '--language',
            type=str,
            default='English'
        )

    def parse(self) -> ArgvData:
        result = self.parser.parse_args()
        if result.ref_audio:
            result.ref_audio = result.ref_audio.absolute()

        return ArgvData(
            output=result.output.absolute(),
            prompt=result.prompt,
            refText=result.ref_text,
            refAudio=result.ref_audio,
            language=result.language
        )