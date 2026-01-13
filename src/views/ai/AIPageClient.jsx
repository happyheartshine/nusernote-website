'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
// import TabNavigation from '@/components/ai/TabNavigation';
import SOAPTab from '@/components/ai/SOAPTab';
import RecordsTab from '@/components/ai/RecordsTab';

// ==============================|| AI PAGE CLIENT ||============================== //

export default function AIPageClient() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('soap');

  // Initialize tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['soap', 'records'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // const handleTabChange = (newTab) => {
  //   setActiveTab(newTab);
  //   // Update URL when tab changes
  //   const params = new URLSearchParams(searchParams);
  //   params.set('tab', newTab);
  //   router.push(`/ai?${params.toString()}`, { scroll: false });
  // };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        {/* <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} /> */}

        <div className="mt-6">
          {activeTab === 'soap' && <SOAPTab />}
          {activeTab === 'records' && <RecordsTab />}
        </div>
      </div>
    </div>
  );
}


