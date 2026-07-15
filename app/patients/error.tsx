"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function PatientsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="directory-shell">
      <section className="directory-empty error">
        <AlertTriangle size={30} />
        <h1>Patient directory unavailable</h1>
        <p>The demo data could not be loaded. Retry once, then return to the Decision map.</p>
        <div>
          <button onClick={reset}><RotateCcw size={16} /> Retry</button>
          <Link href="/">Return to Decision map</Link>
        </div>
      </section>
    </main>
  );
}
