#!/usr/bin/env node
/**
 * Apply Still's UI-only layer to a checkout of HamsterBase Tasks.
 * Usage: node apply.mjs /path/to/tasks_hamsterbase
 * No core, services, storage, sync, or server files are modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const overlay = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
function replaceOnce(file, before, after) {
  const original = read(file);
  if (original.includes(after)) return;
  if (!original.includes(before)) throw new Error('Unsupported upstream layout in ' + file);
  fs.writeFileSync(path.join(root, file), original.replace(before, after));
}
function installFile(from, to) {
  fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  fs.copyFileSync(path.join(overlay, from), path.join(root, to));
}
if (!fs.existsSync(path.join(root, 'src/mobile/App.tsx')) || !fs.existsSync(path.join(root, 'src/desktop/app.tsx'))) {
  throw new Error('Target must be the HamsterBase Tasks repository root.');
}
installFile('still.css', 'src/styles/still.css');
installFile('StillTransfer.tsx', 'src/still/StillTransfer.tsx');
replaceOnce('src/styles/main.css', "@import './reset.css';", "@import './reset.css';\n@import './still.css';");
replaceOnce('src/mobile/App.tsx', "import { useService } from '@/hooks/use-service';",
  "import { StillTransfer } from '@/still/StillTransfer';\nimport { useService } from '@/hooks/use-service';");
replaceOnce('src/mobile/App.tsx', '      <BrowserRouter>', '      <StillTransfer />\n      <BrowserRouter>');
replaceOnce('src/desktop/app.tsx', "import { SidebarLayout } from '@/desktop/components/SidebarLayout/SidebarLayout.tsx';",
  "import { StillTransfer } from '@/still/StillTransfer';\nimport { SidebarLayout } from '@/desktop/components/SidebarLayout/SidebarLayout.tsx';");
replaceOnce('src/desktop/app.tsx', '      <TreeSelectOverlay />', '      <TreeSelectOverlay />\n      <StillTransfer />');
replaceOnce('src/mobile/pages/home.tsx', "title: localize('home.title', 'Home'),", "title: 'Still',");
replaceOnce('index.html', '<title>HamsterBase Tasks</title>', '<title>Still — tasks, quietly</title>');
console.log('Still UI installed. HamsterBase services, data model, sync and backend are unchanged.');
