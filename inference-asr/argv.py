from pathlib import Path
from argparse import ArgumentParser
from dataclasses import dataclass

@dataclass
class ArgvData:
    input: Path
    language: str | None
    maxNewTokens: int
    batchSizeLimit: int

class Argv:
    def parse(self) -> ArgvData:
        parser = ArgumentParser()
        parser.add_argument(
            'input',
            type=Path,
            help='The audio file do you want to transcribe.',
        )

        parser.add_argument(
            '-l', '--language',
            type=str,
            help='The language of your input file.'
        )

        parser.add_argument(
            '-t', '--max-new-tokens',
            type=int,
            help='Maximum number of tokens to generate. Set a larger value for long audio input.',
            default=256
        )

        parser.add_argument(
            '-b', '--batch-size-limit',
            type=int,
            help='Batch size limit for inference. -1 means unlimited. Smaller values can help avoid OOM.',
            default=32
        )

        output = parser.parse_args()
        return ArgvData(
            input=output.input,
            language=output.language,
            maxNewTokens=output.max_new_tokens,
            batchSizeLimit=output.batch_size_limit
        )