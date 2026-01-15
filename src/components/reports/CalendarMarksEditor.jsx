'use client';

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Calendar Marks Editor Component
 * Renders a month grid and allows editing visit marks
 * Marks: ○ (CIRCLE), △ (TRIANGLE), ◎ (DOUBLE_CIRCLE), □ (SQUARE), ✔︎ (CHECK)
 */
export default function CalendarMarksEditor({ yearMonth, marks, visits, onChange, readOnly = false }) {
  const [localMarks, setLocalMarks] = useState({});

  useEffect(() => {
    // Initialize local marks from props
    const marksMap = {};
    if (marks && Array.isArray(marks)) {
      marks.forEach(mark => {
        marksMap[mark.date] = mark.mark_type;
      });
    }
    setLocalMarks(marksMap);
  }, [marks, yearMonth]);

  // Parse year-month
  const [year, month] = yearMonth ? yearMonth.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday

  // Get visits by date for auto-generation
  const visitsByDate = {};
  if (visits && Array.isArray(visits)) {
    visits.forEach(visit => {
      if (visit.visit_date) {
        const date = visit.visit_date.split('T')[0]; // Get YYYY-MM-DD part
        visitsByDate[date] = visit;
      }
    });
  }

  // Get mark for a specific date
  const getMarkForDate = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return localMarks[dateStr] || null;
  };

  // Toggle mark for a date
  const toggleMark = (day, currentMark) => {
    if (readOnly) return;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasVisit = visitsByDate[dateStr] !== undefined;

    let newMark = null;

    // If has visit, cycle through: CIRCLE -> DOUBLE_CIRCLE -> CHECK -> CIRCLE
    // User can also manually set TRIANGLE or SQUARE
    if (hasVisit) {
      if (currentMark === 'CIRCLE') {
        newMark = 'DOUBLE_CIRCLE';
      } else if (currentMark === 'DOUBLE_CIRCLE') {
        newMark = 'CHECK';
      } else if (currentMark === 'CHECK') {
        newMark = 'CIRCLE';
      } else if (currentMark === 'TRIANGLE') {
        newMark = null; // Clear triangle
      } else if (currentMark === 'SQUARE') {
        newMark = null; // Clear square
      } else {
        // Auto-set CIRCLE for visits
        newMark = 'CIRCLE';
      }
    } else {
      // For days without visits, only allow TRIANGLE and SQUARE
      if (currentMark === 'TRIANGLE') {
        newMark = 'SQUARE';
      } else if (currentMark === 'SQUARE') {
        newMark = null;
      } else {
        newMark = 'TRIANGLE';
      }
    }

    const updatedMarks = { ...localMarks };
    if (newMark) {
      updatedMarks[dateStr] = newMark;
    } else {
      delete updatedMarks[dateStr];
    }
    setLocalMarks(updatedMarks);

    // Notify parent
    if (onChange) {
      const marksArray = Object.entries(updatedMarks).map(([date, markType]) => ({
        date,
        mark_type: markType,
      }));
      onChange(marksArray);
    }
  };

  // Render mark symbol
  const renderMark = (markType) => {
    const marks = {
      CIRCLE: '○',
      TRIANGLE: '△',
      DOUBLE_CIRCLE: '◎',
      SQUARE: '□',
      CHECK: '✔︎',
    };
    return marks[markType] || '';
  };

  // Get mark class for styling
  const getMarkClass = (markType, hasVisit) => {
    if (markType === 'TRIANGLE' || markType === 'SQUARE') {
      return 'text-blue-600 font-bold';
    }
    if (hasVisit) {
      return 'text-gray-700';
    }
    return 'text-gray-400';
  };

  // Generate calendar grid
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push({ day: null, isEmpty: true });
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasVisit = visitsByDate[dateStr] !== undefined;
    const mark = getMarkForDate(day);
    
    calendarDays.push({
      day,
      dateStr,
      hasVisit,
      mark,
    });
  }

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {year}年{month}月
        </h3>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className="text-center text-xs font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((item, idx) => {
          if (item.isEmpty) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const { day, dateStr, hasVisit, mark } = item;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <button
              key={day}
              type="button"
              onClick={() => !readOnly && toggleMark(day, mark)}
              disabled={readOnly}
              className={`
                aspect-square rounded border p-1 text-center text-sm
                ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                ${hasVisit ? 'bg-gray-50' : ''}
                ${!readOnly ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}
                ${mark ? getMarkClass(mark, hasVisit) : 'text-gray-400'}
              `}
              title={hasVisit ? `訪問あり - ${dateStr}` : dateStr}
            >
              <div className="text-xs text-gray-500">{day}</div>
              {mark && (
                <div className="text-lg leading-none mt-0.5">
                  {renderMark(mark)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="text-lg">○</span>
          <span>訪問（通常）</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">◎</span>
          <span>訪問（重要）</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg">✔︎</span>
          <span>訪問（完了）</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg text-blue-600">△</span>
          <span>手動マーク</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg text-blue-600">□</span>
          <span>手動マーク</span>
        </div>
      </div>
    </div>
  );
}

CalendarMarksEditor.propTypes = {
  yearMonth: PropTypes.string.isRequired, // YYYY-MM format
  marks: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired, // YYYY-MM-DD
      mark_type: PropTypes.oneOf(['CIRCLE', 'TRIANGLE', 'DOUBLE_CIRCLE', 'SQUARE', 'CHECK']).isRequired,
    })
  ),
  visits: PropTypes.arrayOf(
    PropTypes.shape({
      visit_date: PropTypes.string.isRequired,
    })
  ),
  onChange: PropTypes.func, // Called with updated marks array
  readOnly: PropTypes.bool,
};
