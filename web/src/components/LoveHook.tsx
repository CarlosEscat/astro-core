export function LoveHook({ hook, prose }: { hook: string; prose: string }) {
  // The hook is the first SENTENCE of the love block, and the model does not
  // reliably break the line after it — so strip the hook by prefix, not by line.
  const rest = prose.startsWith(hook) ? prose.slice(hook.length).trim() : "";
  const body = rest || prose;

  return (
    <>
      <div className="hook">
        <p>«{hook}»</p>
        <span className="mark">Destiny Reports · tu lectura</span>
      </div>
      <div className="prose">
        {body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </>
  );
}
