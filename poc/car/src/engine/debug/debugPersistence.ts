import type GUI from 'lil-gui';
import { FunctionController, type Controller } from 'lil-gui';

const DEFAULT_STORAGE_KEY = 'rally-game.debug.gui';

interface FolderState {
    closed: boolean;
    folders: Record<string, FolderState>;
}

interface ValuesState {
    controllers: Record<string, unknown>;
    folders: Record<string, ValuesState>;
}

interface PersistedState {
    values?: ValuesState;
    ui?: FolderState;
}

/**
 * Persist all lil-gui controller values AND folder open/closed state across
 * reloads, with per-folder and global "Reset" buttons.
 *
 * Call once after every `registerDebug` has run. `gui.reset()` reverts to the
 * value lil-gui captured when each controller was added — i.e. the component
 * default in source — so no defaults table is needed here.
 *
 * Saves on `onFinishChange` (not `onChange`) so dragging a slider doesn't
 * thrash localStorage on every frame, and on `onOpenClose` for folder toggles.
 *
 * Disabled controllers are read-only readouts (speed, slip, surface under a
 * wheel…): they are neither saved nor loaded, otherwise a stale value from
 * the previous session would be shown until the readout next changes.
 */
export function installGuiPersistence(gui: GUI, storageKey = DEFAULT_STORAGE_KEY): void {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
        try {
            const parsed: unknown = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                const state = parsed as PersistedState;
                if (state.values) loadValues(gui, state.values);
                if (state.ui) loadFolderState(gui, state.ui);
            }
        } catch (e) {
            console.warn('GUI persistence: stored state invalid, dropping it.', e);
            localStorage.removeItem(storageKey);
        }
    }

    const save = (): void => {
        const state: PersistedState = {
            values: saveValues(gui),
            ui: saveFolderState(gui),
        };
        localStorage.setItem(storageKey, JSON.stringify(state));
    };

    for (const folder of gui.foldersRecursive()) {
        addResetButton(folder, save);
    }
    addResetButton(gui, save, true);

    gui.onFinishChange(save);
    gui.onOpenClose(save);
}

function addResetButton(target: GUI, save: () => void, all = false): void {
    const label = all ? 'Reset all' : 'Reset folder';
    const recursive = all;
    const actions = {
        [label]: () => {
            target.reset(recursive);
            save();
        },
    };
    target.add(actions, label);
}

/** Same shape as `gui.save()`, minus function buttons and disabled readouts. */
function saveValues(gui: GUI): ValuesState {
    const controllers: Record<string, unknown> = {};
    for (const c of gui.controllers) {
        if (!persistable(c)) continue;
        controllers[c._name] = c.save();
    }
    const folders: Record<string, ValuesState> = {};
    for (const f of gui.folders) folders[f._title] = saveValues(f);
    return { controllers, folders };
}

function loadValues(gui: GUI, state: ValuesState): void {
    for (const c of gui.controllers) {
        if (!persistable(c)) continue;
        if (c._name in state.controllers) c.load(state.controllers[c._name]);
    }
    for (const f of gui.folders) {
        const sub = state.folders[f._title];
        if (sub) loadValues(f, sub);
    }
}

function persistable(c: Controller): boolean {
    return !(c instanceof FunctionController) && !c._disabled;
}

function saveFolderState(gui: GUI): FolderState {
    const folders: Record<string, FolderState> = {};
    for (const f of gui.folders) folders[f._title] = saveFolderState(f);
    return { closed: gui._closed, folders };
}

function loadFolderState(gui: GUI, state: FolderState): void {
    gui.open(!state.closed);
    for (const f of gui.folders) {
        const sub = state.folders[f._title];
        if (sub) loadFolderState(f, sub);
    }
}
