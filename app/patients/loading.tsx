export default function PatientsLoading() {
  return (
    <main className="directory-shell directory-loading" aria-busy="true">
      <div className="directory-loading-bar" />
      <div className="directory-content">
        <div className="directory-loading-title" />
        <div className="directory-loading-metrics">
          {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
        </div>
        <div className="directory-loading-table" />
      </div>
    </main>
  );
}
