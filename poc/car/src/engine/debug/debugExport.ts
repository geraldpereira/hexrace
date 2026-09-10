import type GUI from 'lil-gui';
import { FunctionController, type Controller } from 'lil-gui';

interface ExportEntry {
    property: string;
    name: string;
    current: unknown;
    default: unknown;
    changed: boolean;
}
type ExportPayload = Record<string, ExportEntry[]>;

/**
 * Adds a "Copy debug values" button that dumps every tweakable controller as
 * pretty JSON (grouped by folder path, current vs original) into the
 * clipboard, ready to paste back into source defaults.
 *
 * Snapshots the defaults at install time, so this must be called AFTER all
 * `registerDebug` have run but BEFORE `installGuiPersistence` — otherwise the
 * localStorage-loaded values would be treated as the "defaults".
 */
export function installGuiExport(gui: GUI): void {
    const defaults = new Map<Controller, unknown>();
    for (const c of trackable(gui)) defaults.set(c, snapshot(c));

    const action = {
        'Copy debug values': () => {
            const payload: ExportPayload = {};
            for (const c of trackable(gui)) {
                if (!defaults.has(c)) continue;
                const cur = snapshot(c);
                const def = defaults.get(c);
                const path = folderPath(c.parent, gui);
                (payload[path] ??= []).push({
                    property: c.property,
                    name: c._name,
                    current: cur,
                    default: def,
                    changed: JSON.stringify(cur) !== JSON.stringify(def),
                });
            }
            const json = JSON.stringify(payload, null, 2);
            void navigator.clipboard.writeText(json).then(
                () => {
                    console.log('Debug values copied to clipboard:\n' + json);
                },
                (err: unknown) => {
                    console.error('Clipboard copy failed', err, '\n' + json);
                },
            );
        },
    };
    gui.add(action, 'Copy debug values');
}

function* trackable(gui: GUI): Generator<Controller> {
    for (const c of gui.controllersRecursive()) {
        if (c instanceof FunctionController) continue;
        if (c._disabled) continue;
        yield c;
    }
}

function folderPath(folder: GUI, root: GUI): string {
    const parts: string[] = [];
    let cur: GUI = folder;
    while (cur !== root) {
        parts.unshift(cur._title);
        cur = cur.parent;
    }
    return parts.length ? parts.join(' > ') : '(root)';
}

function snapshot(c: Controller): unknown {
    return structuredClone(c.getValue());
}
