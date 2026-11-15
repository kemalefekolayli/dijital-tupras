import sys, asyncio
from pathlib import Path
sys.path.insert(0,str(Path('vendor').resolve()))
import edge_tts
async def main():
    text='Doğru cevap B. Eşyaya uygulanan vergi oranı. Aynı eşyanın ilk altı hanesi ortaktır. Vergi oranı ise ülkeye göre değişebilir.'
    await edge_tts.Communicate(text,'tr-TR-AhmetNeural',rate='-5%').save('assets/answer.mp3')
asyncio.run(main())
