import torch
from pathlib import Path
from qwen_asr import Qwen3ASRModel
from transcribe import transcribe

def main():
    model = Qwen3ASRModel.from_pretrained(
        "Qwen/Qwen3-ASR-1.7B",
        dtype=torch.bfloat16,
        device_map="cuda:0",
        # attn_implementation="flash_attention_2",
        max_inference_batch_size=32, # Batch size limit for inference. -1 means unlimited. Smaller values can help avoid OOM.
        max_new_tokens=256, # Maximum number of tokens to generate. Set a larger value for long audio input.
    )

    results = transcribe(
        model,
        [
            { "path": Path('../frieren.mp3').resolve() }
        ]
    )

    print(results[0].lang)
    print(results[0].text)


if __name__ == "__main__":
    main()
