// Shim portado del repo Pixel Agents (office/toolUtils.ts).
// En el contexto Windmar no hay "reading tools" del lado VS Code, así que el
// personaje siempre usa la animación de typing cuando trabaja.
export function isReadingToolName(_name: string | null | undefined): boolean {
  return false;
}
export function isSubagentToolName(_name: string | null | undefined): boolean {
  return false;
}
export function extractToolName(status: string): string | null {
  const first = (status || "").split(/[\s:]/)[0];
  return first || null;
}
