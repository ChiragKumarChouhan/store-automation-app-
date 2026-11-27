export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-600 lg:px-6 no-print">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-slate-800">Developed &amp; Maintained By:</span>
          <span>Chirag Kumar</span>
          <span className="text-slate-300">•</span>
          <span>Dev Malik</span>
          <span className="text-slate-300">•</span>
          <span className="font-medium text-slate-700">CSE-15</span>
          <span className="text-slate-300">|</span>
          <span className="font-medium text-blue-700">Full Stack Development Team</span>
        </div>
        <div className="text-slate-500">
          © 2026 ABESEC Ghaziabad. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
