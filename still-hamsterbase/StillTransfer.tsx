import React, { useState } from 'react';
import { useService } from '@/hooks/use-service';
import { ITodoService } from '@/services/todo/common/todoService';
import { checkPlatform } from '@/base/browser/checkPlatform';

/** Still's portable interchange formats. HamsterBase's native .hbTask backup remains untouched. */
type PortableTask = {
  title: string;
  notes?: string;
  project?: string;
  dueDate?: string;
  startDate?: string;
  completed?: boolean;
  tags?: string[];
};
type PortableBackup = { format: 'still-tasks-v1'; exportedAt: string; tasks: PortableTask[] };

function isoDate(timestamp?: number): string | undefined {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString().slice(0, 10);
}
function parseDate(input?: string): number | undefined {
  if (!input) return undefined;
  const normalized = input.trim();
  if (!normalized) return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized + 'T00:00:00Z' : normalized);
  return Number.isFinite(date.getTime()) ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) : undefined;
}
function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
function readPortable(text: string, fileName: string): PortableTask[] {
  if (fileName.toLowerCase().endsWith('.json')) {
    const json: unknown = JSON.parse(text);
    const raw = Array.isArray(json) ? json : (json as PortableBackup)?.tasks;
    if (!Array.isArray(raw)) throw new Error('JSON must contain a tasks array.');
    return raw.filter((item) => item && typeof item.title === 'string').map((item) => ({
      title: item.title, notes: item.notes, project: item.project,
      dueDate: item.dueDate, startDate: item.startDate,
      completed: item.completed === true, tags: Array.isArray(item.tags) ? item.tags : [],
    }));
  }
  if (fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.txt')) {
    return text.split(/\r?\n/).map((line) => {
      const match = line.match(/^\s*(?:[-*]\s+)?(?:\[([ xX])\]\s*)?(.+?)\s*$/);
      if (!match) return null;
      if (/^#|^---/.test(match[2])) return null;
      return { title: match[2], completed: (match[1] || '').toLowerCase() === 'x' };
    }).filter((x): x is PortableTask => x !== null);
  }
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/[ _-]/g, ''));
  const field = (row: string[], ...names: string[]) => {
    for (const name of names) {
      const index = headers.indexOf(name);
      if (index >= 0) return row[index]?.trim() || '';
    }
    return '';
  };
  return rows.slice(1).filter((row) => {
    const kind = field(row, 'type');
    return !kind || kind.toLowerCase() === 'task';
  }).map((row) => ({
    title: field(row, 'content', 'title', 'task', 'name'),
    notes: field(row, 'description', 'notes', 'note'),
    project: field(row, 'projectname', 'project', 'list'),
    dueDate: field(row, 'date', 'duedate', 'due'),
    completed: /^(1|true|yes|completed|done)$/i.test(field(row, 'completed', 'iscompleted', 'status')),
    tags: field(row, 'labels', 'tags').split(/[;,]/).map((s) => s.trim()).filter(Boolean),
  })).filter((task) => task.title);
}
async function download(name: string, contents: string, mime: string) {
  if (checkPlatform().isNative) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]);
    const path = 'still-' + Date.now() + '/' + name;
    await Filesystem.mkdir({ directory: Directory.Cache, path: path.split('/')[0], recursive: true });
    await Filesystem.writeFile({ directory: Directory.Cache, path, data: contents, encoding: Encoding.UTF8 });
    const uri = await Filesystem.getUri({ directory: Directory.Cache, path });
    await Share.share({ title: name, url: uri.uri });
  } else {
    const url = URL.createObjectURL(new Blob([contents], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
export const StillTransfer: React.FC = () => {
  const todo = useService(ITodoService);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const tasks = (): PortableTask[] => {
    const state = todo.modelState;
    return state.taskList.filter((item) => item.type === 'task').map((item) => {
      if (item.type !== 'task') return { title: '' };
      const parent = item.parentId ? state.taskObjectMap.get(item.parentId) : undefined;
      const project = parent?.type === 'project' ? parent.title : undefined;
      return { title: item.title, notes: item.notes, project, dueDate: isoDate(item.dueDate),
        startDate: isoDate(item.startDate), completed: item.status === 'completed', tags: item.tags };
    });
  };
  const exportAs = async (format: 'json' | 'csv' | 'md') => {
    try {
      setBusy(true); setStatus('');
      const data = tasks();
      if (format === 'json') {
        const backup: PortableBackup = { format: 'still-tasks-v1', exportedAt: new Date().toISOString(), tasks: data };
        await download('still-tasks.json', JSON.stringify(backup, null, 2), 'application/json');
      } else if (format === 'csv') {
        const header = ['TYPE','CONTENT','DESCRIPTION','PROJECT NAME','DATE','COMPLETED','LABELS'];
        const rows = data.map((t) => ['task',t.title,t.notes,t.project,t.dueDate,t.completed ? 'true' : 'false',(t.tags || []).join(';')].map(csvEscape).join(','));
        await download('still-tasks.csv', [header.join(','), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
      } else {
        await download('still-tasks.md', data.map((t) => '- [' + (t.completed ? 'x' : ' ') + '] ' + t.title.replace(/\r?\n/g, ' ')).join('\n'), 'text/markdown');
      }
      setStatus('Exported ' + data.length + ' tasks.');
    } catch (error) { setStatus('Export failed: ' + (error as Error).message); }
    finally { setBusy(false); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      setBusy(true); setStatus('');
      if (file.size > 5 * 1024 * 1024) throw new Error('Maximum file size is 5 MB.');
      const parsed = readPortable(await file.text(), file.name);
      if (parsed.length > 5000) throw new Error('Import limited to 5,000 tasks per file.');
      if (!parsed.length) throw new Error('No supported tasks found.');
      if (!window.confirm('Import ' + parsed.length + ' tasks into Still? Existing tasks will remain.')) return;
      const projects = new Map<string, string>();
      let created = 0;
      for (const task of parsed) {
        let parentId: string | undefined;
        if (task.project) {
          parentId = projects.get(task.project);
          if (!parentId) {
            parentId = todo.addProject({ title: task.project });
            projects.set(task.project, parentId);
          }
        }
        const id = todo.addTask({
          title: task.title,
          notes: task.notes,
          dueDate: parseDate(task.dueDate),
          startDate: parseDate(task.startDate),
          tags: task.tags,
          position: parentId ? { type: 'firstElement', parentId } : undefined,
        });
        if (task.completed) todo.updateTask(id, { status: 'completed' });
        created++;
      }
      setStatus('Imported ' + created + ' tasks. ' + projects.size + ' project groups created.');
    } catch (error) { setStatus('Import failed: ' + (error as Error).message); }
    finally { setBusy(false); }
  };
  return <>
    <button type="button" className="still-transfer-launch" onClick={() => setOpen(true)} aria-label="Open Still import and export">↗ Move data</button>
    {open && <div className="still-transfer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="still-transfer-panel" role="dialog" aria-modal="true" aria-label="Still import and export">
        <button type="button" className="still-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
        <h2>Move freely.</h2>
        <p>Your tasks belong to you. Export a portable copy or bring tasks from Todoist and other apps, without replacing the original HamsterBase database.</p>
        <h3>Export tasks</h3>
        <div className="still-options">
          <button disabled={busy} onClick={() => exportAs('json')}>↓ JSON</button>
          <button disabled={busy} onClick={() => exportAs('csv')}>↓ CSV</button>
          <button disabled={busy} onClick={() => exportAs('md')}>↓ Markdown</button>
        </div>
        <h3>Import tasks</h3>
        <div className="still-options">
          <label className="still-import-label">↑ Choose CSV, JSON, or Markdown
            <input type="file" accept=".csv,.json,.md,.txt,text/csv,application/json" disabled={busy}
              onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
          </label>
        </div>
        <p>Todoist CSV (task rows), generic task CSV, Still JSON, and Markdown checklists are supported. Projects from CSV are grouped by name.</p>
        <div className="still-warning">Portable formats transfer common task fields, not complete reminders, recurrence, attachments, or nested structures. For a complete backup, use the original .hbTask import/export in Settings.</div>
        {status && <div className="still-status" role="status">{status}</div>}
      </section>
    </div>}
  </>;
};
