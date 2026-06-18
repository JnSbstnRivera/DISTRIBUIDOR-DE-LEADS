// Fondo animado tipo aurora. El CSS se inyecta en runtime (<style>) para que
// NO pase por el pipeline de Tailwind/Lightning CSS (que lo purgaba en build).
const AURORA_CSS = `
.wm-aurora{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
.wm-blob{position:absolute;border-radius:9999px;filter:blur(95px);will-change:transform}
.wm-a{width:42vw;height:42vw;background:var(--color-wh-orange);top:-12vw;left:-6vw;opacity:.16;animation:wmA 26s ease-in-out infinite}
.wm-b{width:46vw;height:46vw;background:var(--color-wh-blue);bottom:-16vw;right:-8vw;opacity:.16;animation:wmB 32s ease-in-out infinite}
.wm-c{width:34vw;height:34vw;background:var(--color-wh-light-blue);top:28%;left:34%;opacity:.10;animation:wmC 38s ease-in-out infinite}
.dark .wm-a,.dark .wm-b{opacity:.36}
.dark .wm-c{opacity:.20}
@keyframes wmA{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(6vw,4vw) scale(1.12)}66%{transform:translate(-4vw,7vw) scale(.94)}}
@keyframes wmB{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-7vw,-5vw) scale(1.1)}70%{transform:translate(5vw,-3vw) scale(.92)}}
@keyframes wmC{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-6vw,-8vw) scale(1.15)}}
@media (prefers-reduced-motion: reduce){.wm-blob{animation:none}}
`;

export default function AnimatedBackground() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AURORA_CSS }} />
      <div className="wm-aurora" aria-hidden="true">
        <span className="wm-blob wm-a" />
        <span className="wm-blob wm-b" />
        <span className="wm-blob wm-c" />
      </div>
    </>
  );
}
