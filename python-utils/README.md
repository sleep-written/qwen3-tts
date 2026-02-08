# ndjson-cli

Emit NDJSON events and optionally intercept stdout/stderr.

## Example

```py
from ndjson_cli import CLI

cli = CLI()
cli.enable_intercept()

print("Loading models from huggingface:  [#   ]")
cli.send("Initializing program")
```
