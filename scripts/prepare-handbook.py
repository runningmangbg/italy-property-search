"""Prepare the existing static handbook for a private, same-login import.

Usage: python3 scripts/prepare-handbook.py DIST OUTPUT REVISION SOURCE_DATE OLD_HOUSES_URL
The source and output must stay outside this public repository's tracked files.
"""
import json
import posixpath
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.feed(text)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag in ('script', 'iframe', 'object', 'embed', 'form', 'base', 'meta'):
            if tag != 'meta' or 'http-equiv' in attrs:
                raise ValueError('Active content must not be imported')
        if any(name.startswith('on') for name in attrs) or 'style' in attrs:
            raise ValueError('Inline active content must not be imported')
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        for name in ('href', 'src'):
            if attrs.get(name):
                self.links.append(attrs[name])


def prepare(source, output, revision, source_date, old_houses_url):
    files = []
    pages = {}
    for path in sorted(source.rglob('*')):
        if not path.is_file() or path.suffix not in ('.html', '.css'):
            continue
        name = path.relative_to(source).as_posix()
        if not re.fullmatch(r'(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+\.(?:html|css)', name):
            raise ValueError('Unexpected file path: ' + name)
        content = path.read_text(encoding='utf-8')
        if path.suffix == '.html':
            # Preserve chapter prose, structure, source links and date labels.
            content = content.replace('href="' + old_houses_url + '">Husen ↗', 'href="/">← Husen')
            if old_houses_url in content:
                raise ValueError('An old property-site link needs explicit review: ' + name)
            pages[name] = Page(content)
        files.append({'path': name, 'content': content})
    names = {file['path'] for file in files}
    if not {'index.html', 'assets/handbook.css'}.issubset(names):
        raise ValueError('Missing handbook index or stylesheet')
    for name, page in pages.items():
        for href in page.links:
            url = urlsplit(href)
            if url.scheme:
                if url.scheme not in ('http', 'https', 'mailto', 'data'):
                    raise ValueError('Unsupported link: ' + href)
                continue
            if url.netloc:
                raise ValueError('Protocol-relative link requires review: ' + href)
            if url.path == '/':
                continue
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), unquote(url.path))) if url.path else name
            if target not in names:
                raise ValueError(f'Broken link in {name}: {href}')
            if url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                raise ValueError(f'Broken anchor in {name}: {href}')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({'sourceRevision': revision, 'sourceDate': source_date, 'files': files}, ensure_ascii=False), encoding='utf-8')
    output.chmod(0o600)
    print(json.dumps({'files': len(files), 'pages': len(pages), 'bytes': output.stat().st_size}))


if __name__ == '__main__':
    prepare(Path(sys.argv[1]), Path(sys.argv[2]), *sys.argv[3:])
