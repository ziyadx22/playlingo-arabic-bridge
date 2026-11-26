"""Package corresponding app/native source, excluding credentials and build output."""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_DIRS = ['src', 'scripts', 'ios-native-plugin', 'public', '.github']
ALLOWED_ROOT = ['LICENSE', 'README.md', 'AGENTS.md', 'package.json', 'bun.lock', 'bunfig.toml', 'capacitor.config.ts', 'codemagic.yaml', 'components.json', 'eslint.config.js', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', '.gitignore', '.prettierrc', '.prettierignore']
EXCLUDED = {'.git', '.jj', 'node_modules', '__pycache__', 'build', 'dist', '.output', '.lovable', '.wrangler', '.tanstack'}

def main():
    output = ROOT / 'public/licenses/mzgta-source.zip'
    files = [ROOT / name for name in ALLOWED_ROOT if (ROOT / name).is_file()]
    for directory in ALLOWED_DIRS:
        for path in (ROOT / directory).rglob('*'):
            relative = path.relative_to(ROOT)
            if path.is_file() and not path.is_symlink() and not any(p in EXCLUDED for p in relative.parts) and 'licenses' not in relative.parts and not path.name.startswith('.env') and path.suffix not in ['.pyc', '.log']:
                files.append(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path('/tmp/mzgta-source-offer.zip')
    with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(set(files)):
            archive.write(path, 'mzgta/' + path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(temporary) as archive:
        names = archive.namelist()
        assert any(n.endswith('PS5RemotePlayPlugin.swift') for n in names)
        assert any(n.endswith('LICENSE') for n in names)
        assert not any('/.git/' in n or '/.env' in n or '/node_modules/' in n for n in names)
        assert archive.testzip() is None
    output.write_bytes(temporary.read_bytes())
    print(f'Prepared and inspected {len(files)} source files; no credentials or build output')

if __name__ == '__main__':
    main()
