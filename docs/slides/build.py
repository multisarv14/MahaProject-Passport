"""Builds the self-contained final deck: inlines docs/slides/img/*.jpg into final.src.html.
Usage: python3 docs/slides/build.py   →  docs/slides/maha-passport-final.html
"""
import base64, pathlib, re

here = pathlib.Path(__file__).parent
src = (here / 'final.src.html').read_text(encoding='utf-8')

def inline(m):
    data = base64.b64encode((here / 'img' / f'{m.group(1)}.jpg').read_bytes()).decode()
    return f'data:image/jpeg;base64,{data}'

out = re.sub(r'\{\{IMG:([\w-]+)\}\}', inline, src)
(here / 'maha-passport-final.html').write_text(out, encoding='utf-8')
print('built', len(out) // 1024, 'KB')
