"""Reproducible independent GPL-2.0-or-later dictionary conversion, not app code."""
import hashlib
import json
from pathlib import Path
import re
import tarfile
import urllib.request
import xml.etree.ElementTree as ET

URL = 'https://download.freedict.org/dictionaries/eng-ara/0.6.3/freedict-eng-ara-0.6.3.src.tar.xz'
SHA512 = '2604f6ce902e719c61fcf391bef02cdbf5eb60f5acd4f601b243933081689c0cfc4e169400f84bdda95a77110d545ddba444739d9d05b6d5d2a12b7aeab1bbd1'
ROOT = Path(__file__).resolve().parent.parent

def main():
    source = Path('/tmp/mzgta-research/eng-ara.tar.xz')
    payload = source.read_bytes() if source.exists() else urllib.request.urlopen(URL, timeout=30).read()
    if hashlib.sha512(payload).hexdigest() != SHA512:
        raise ValueError('Source checksum mismatch')
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_bytes(payload)
    with tarfile.open(source) as archive:
        tei = archive.extractfile('eng-ara/eng-ara.tei').read()
        license_text = archive.extractfile('eng-ara/COPYING').read()
    ns = {'t': 'http://www.tei-c.org/ns/1.0'}
    entries = {}
    for entry in ET.fromstring(tei).findall('.//t:entry', ns):
        en = entry.findtext('t:form/t:orth', default='', namespaces=ns)
        import unicodedata
        en = unicodedata.normalize('NFKC', en).lower().replace('’', "'").replace('‘', "'")
        en = re.sub(r'\s+', ' ', re.sub(r"[^a-z0-9' -]", ' ', en)).strip()
        translations = [''.join(x.itertext()).strip() for x in entry.findall('.//t:cit[@type="trans"]/t:quote', ns)]
        ar = next((x for x in translations if re.search('[\u0600-\u06ff]', x)), '')
        if en and ar and len(en) <= 120 and re.search('[a-z]', en):
            entries.setdefault(en, ar)
    if len(entries) < 30000:
        raise ValueError(f'Insufficient real entries: {len(entries)}')
    folder = ROOT / 'public/packs'
    folder.mkdir(parents=True, exist_ok=True)
    result = {'id': 'gaming-dictionary-v2', 'name': 'قاموس الألعاب والمفردات العامة', 'source': 'FreeDict / Arabeyes English–Arabic 0.6.3', 'license': 'GPL-2.0-or-later (dictionary data only)', 'sourceUrl': URL, 'entryCount': len(entries), 'entries': [{'en': en, 'ar': ar} for en, ar in sorted(entries.items())]}
    (folder / 'gaming-dictionary-v2.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')))
    (folder / 'dictionary-COPYING.txt').write_bytes(license_text)
    (folder / 'dictionary-source.tar.xz').write_bytes(payload)
    print(f'{len(entries)} unique real English–Arabic entries')

if __name__ == '__main__':
    main()
