import Link from "next/link";
import { UserRoundX } from "lucide-react";

export default function PatientNotFound() {
  return (
    <main className="directory-shell">
      <section className="directory-empty">
        <UserRoundX size={30} />
        <h1>Patient not found</h1>
        <p>This identifier is not part of the synthetic demo cohort.</p>
        <Link href="/patients">Return to patient overview</Link>
      </section>
    </main>
  );
}
