import Link from "next/link";

/**
 * The flow's frame. Shared by all five steps so the wordmark does not
 * re-mount between questions — one product, not five pages.
 */
export default function CrearLayout({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <div className="shell">
        <Link className="wordmark" href="/">Destiny Reports</Link>
        {children}
      </div>
    </main>
  );
}
