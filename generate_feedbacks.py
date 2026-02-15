import requests
import time
import json

WORKER_URL = "http://localhost:8787"
TARGET = 1000
BATCH_SIZE = 10

def get_progress():
    response = requests.get(f"{WORKER_URL}/progress")
    return response.json()

def generate_batch(count):
    response = requests.post(
        f"{WORKER_URL}/generate",
        json={"count": count}
    )
    return response.json()

# Check current progress
progress = get_progress()
current = progress.get('count', 0)
print(f"📊 Current progress: {current}/{TARGET}")

remaining = TARGET - current

# Generate in batches
batch_count = 0
while remaining > 0:
    to_generate = min(BATCH_SIZE, remaining)
    batch_count += 1
    
    print(f"\n🔄 Batch {batch_count} - Generating {to_generate} feedbacks...")
    
    try:
        result = generate_batch(to_generate)
        
        if result.get('success'):
            print(f"✅ Generated {result['generated']} feedbacks")
            print(f"📈 Total: {result['totalCount']}/{TARGET}")
            remaining = TARGET - result['totalCount']
        else:
            print(f"❌ Error: {result.get('error')}")
            break
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        break
    
    time.sleep(2)  # Delay between batches

print("\n🎉 All done!")
final_progress = get_progress()
print(f"📊 Final count: {final_progress['count']}/{TARGET}")