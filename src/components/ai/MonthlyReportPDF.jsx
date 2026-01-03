'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';
import PDFDownloadButton from './PDFDownloadButton';

export default function MonthlyReportPDF({ patientId }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="year-select" className="mb-2 block text-sm font-medium">
            年
          </label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="form-control"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="month-select" className="mb-2 block text-sm font-medium">
            月
          </label>
          <select
            id="month-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="form-control"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
      </div>

      <PDFDownloadButton
        label="月次レポートPDFを生成"
        endpoint={`/pdf/monthly-report/${patientId}`}
        queryParams={{ year, month }}
        filename={`monthly_report_${patientId}_${year}${String(month).padStart(2, '0')}.pdf`}
      />
    </div>
  );
}

MonthlyReportPDF.propTypes = {
  patientId: PropTypes.string.isRequired,
};


