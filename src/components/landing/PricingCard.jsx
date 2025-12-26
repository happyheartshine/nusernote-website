export default function PricingCard({ plan }) {
  const { name, price, unit, description, features, cta, highlighted } = plan;

  return (
    <div
      className={`relative rounded-2xl border p-8 transition-all ${
        highlighted
          ? 'border-blue-500 bg-blue-50 shadow-xl ring-2 ring-blue-500'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white">
          おすすめ
        </div>
      )}

      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-slate-900">{name}</h3>
        <p className="mb-4 text-sm text-slate-600">{description}</p>
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-slate-900">{price}</span>
          {unit && <span className="ml-1 text-slate-600">{unit}</span>}
        </div>
      </div>

      <ul className="mb-8 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start text-sm text-slate-700">
            <i className="ti ti-check mt-1 mr-2 text-blue-600"></i>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={cta.href}
        className={`block w-full rounded-lg px-6 py-3 text-center font-medium transition-colors ${
          highlighted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {cta.label}
      </a>
    </div>
  );
}
