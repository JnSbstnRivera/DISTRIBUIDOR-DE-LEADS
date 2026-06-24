// Stub del transport del repo (que en VS Code mandaba postMessage a la extensión).
// Aquí persistimos el layout en localStorage y el resto son no-ops.
export const LAYOUT_KEY = "pixelHdLayoutV1";

export const transport = {
  send(msg: any): void {
    try {
      if (msg?.type === "saveLayout" && msg.layout) {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(msg.layout));
      }
      // saveAgentSeats / exportLayout / etc. → no-op en este contexto
    } catch {
      /* ignore */
    }
  },
};
