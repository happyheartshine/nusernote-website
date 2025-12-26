export default function Section({ id, className = '', children, background = 'white' }) {
  const bgClasses = {
    white: 'bg-white',
    gray: 'bg-slate-50',
    gradient: 'bg-gradient-to-b from-slate-50 to-white'
  };

  return (
    <section id={id} className={`py-16 sm:py-20 lg:py-24 ${bgClasses[background]} ${className}`}>
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}
