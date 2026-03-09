import sys
import json
import queue
import threading
from pathlib import Path
from asr import ASR

def emit(data: dict):
    print(json.dumps(data, ensure_ascii=False), flush=True)

def stdin_reader(task_queue: queue.Queue):
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            task_queue.put(data)
        except json.JSONDecodeError as e:
            emit({'type': 'error', 'message': f'Invalid JSON: {e}'})

try:
    asr = ASR()
except Exception as e:
    print(json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False), file=sys.stderr, flush=True)
    sys.exit(1)

emit({'type': 'ready', 'message': 'Listening on stdin'})

task_queue: queue.Queue = queue.Queue()
reader_thread = threading.Thread(target=stdin_reader, args=(task_queue,), daemon=True)
reader_thread.start()

while True:
    try:
        task = task_queue.get(timeout=0.1)
    except queue.Empty:
        if not reader_thread.is_alive():
            break
        continue

    uuid = task.get('uuid')
    path = task.get('path')
    lang = task.get('lang')

    try:
        result = asr.transcribe(Path(path).resolve(), lang)
        emit({'uuid': uuid, 'text': result.text, 'lang': result.lang})
    except Exception as e:
        print(json.dumps({'uuid': uuid, 'message': str(e)}, ensure_ascii=False), file=sys.stderr, flush=True)
        
