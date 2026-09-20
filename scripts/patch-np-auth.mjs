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
const originalCondition = "\t\tif (outputBuffer.includes('Authenticate your account at:')) {\n";
const patchedCondition = "\t\tif (outputBuffer.includes('Authenticate your account at:') || outputBuffer.includes('Open this URL in your browser to authenticate:')) {\n";
const original = '\t\t\t\tconst authUrl = urlMatch[0];\n';
const replacement = `${original}\t\t\t\tconsole.error('\\n${marker}:\\n' + authUrl + '\\nOpen it manually if the browser did not launch.\\n');\n`;
let patchedSource = source;

if (patchedSource.includes(originalCondition)) {
  patchedSource = patchedSource.replace(originalCondition, patchedCondition);
}
if (!patchedSource.includes(patchedCondition)) {
  throw new Error('Could not find np WebAuthn browser-auth hook to patch.');
}
if (!patchedSource.includes(marker)) {
  if (!patchedSource.includes(original)) {
    throw new Error('Could not find np WebAuthn URL hook to patch.');
  }

  patchedSource = patchedSource.replace(original, replacement);
}

if (patchedSource === source) {
  process.stdout.write(`np ${expectedVersion} auth output is already patched.\n`);
  process.exit(0);
}

await writeFile(sourcePath, patchedSource, 'utf8');
process.stdout.write(`Patched np ${expectedVersion} to print the npm WebAuthn URL.\n`);
