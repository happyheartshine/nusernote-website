// next
import Link from 'next/link';

// ==============================|| FOOTER ||============================== //

export default function Footer() {
  return (
    <footer className="pc-footer">
      <div className="footer-wrapper container-fluid mx-10">
        <div className="grid grid-cols-12 gap-1.5">
          <div className="col-span-12 my-1 md:col-span-6">
            <p className="m-0">
              NurseNote ♥ AI.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
