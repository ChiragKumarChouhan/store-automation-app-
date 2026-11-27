export default function LoadingSpinner({ label = 'Loading...', size = 'md' }) {
  const dim = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-500">
      <div
        className={`${dim} animate-spin rounded-full border-2 border-slate-200 border-t-blue-600`}
      />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
