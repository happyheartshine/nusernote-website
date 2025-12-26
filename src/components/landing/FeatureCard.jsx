export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        <i className={`${icon} text-2xl`}></i>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
