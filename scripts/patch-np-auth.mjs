import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const packagePath = fileURLToPath(new URL('../node_modules/np/package.json', import.meta.url));
const sourcePath = fileURLToPath(new URL('../node_modules/np/source/npm/publish.js', import.meta.url));
const expectedVersion = '12.1.1';
const marker = 'Key Reps: npm WebAuthn URL';

const npPackage = JSON.parse(await readFile(packagePath, 'utf8'));
if (npPackage.version !== expectedVersion) {
  throw new Error(`Expected np ${expectedVersion}, found ${npPackage.version ?? 'unknown'}`);
}

const source = await readFile(sourcePath, 'utf8');
if (source.includes(marker)) {
  process.stdout.write(`np ${expectedVersion} auth output is already patched.\n`);
  process.exit(0);
}

const original = '\t\t\t\tconst authUrl = urlMatch[0];\n';
const replacement = `${original}\t\t\t\tconsole.error('\\n${marker}:\\n' + authUrl + '\\nOpen it manually if the browser did not launch.\\n');\n`;
if (!source.includes(original)) {
  throw new Error('Could not find np WebAuthn browser-auth hook to patch.');
}

await writeFile(sourcePath, source.replace(original, replacement), 'utf8');
process.stdout.write(`Patched np ${expectedVersion} to print the npm WebAuthn URL.\n`);
