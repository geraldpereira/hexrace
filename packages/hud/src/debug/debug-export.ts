import { type Controller, FunctionController, type GUI } from 'lil-gui';

interface ExportEntry {
  property: string;
  name: string;
  current: unknown;
  default: unknown;
  changed: boolean;
}

/**
 * Every tweakable value of the panel as JSON, grouped by folder path, current against the value the
 * code started with, so a tuning session can be pasted back into the defaults. Buttons and read-only
 * readouts are left out.
 */
export function exportDebugValues(gui: GUI): string {
  const payload: Record<string, ExportEntry[]> = {};
  for (const controller of gui.controllersRecursive()) {
    if (controller instanceof FunctionController || controller._disabled) continue;
    const path = folderPath(controller, gui);
    const current: unknown = controller.getValue();
    const initial: unknown = controller.initialValue;
    const entries = payload[path] ?? [];
    payload[path] = entries;
    entries.push({
      property: controller.property,
      name: controller._name,
      current,
      default: initial,
      changed: JSON.stringify(current) !== JSON.stringify(initial),
    });
  }
  return JSON.stringify(payload, null, 2);
}

function folderPath(controller: Controller, root: GUI): string {
  const parts: string[] = [];
  for (let gui = controller.parent; gui !== root; gui = gui.parent) parts.unshift(gui._title);
  return parts.length ? parts.join(' > ') : '(root)';
}
