import Link from "next/link";
import { Home, UserRoundX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="directory-shell">
      <section className="directory-empty">
        <UserRoundX size={30} />
        <h1>Page not found</h1>
        <p>This route is not part of the Adherence OS synthetic demo.</p>
        <div>
          <Link href="/">
            <Home size={16} /> Return to live twin
          </Link>
          <Link href="/patients">Patient overview</Link>
        </div>
      </section>
    </main>
  );
}
