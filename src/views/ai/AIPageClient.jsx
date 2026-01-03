'use client';

import { useState } from 'react';
import TabNavigation from '@/components/ai/TabNavigation';
import SOAPTab from '@/components/ai/SOAPTab';
import PlanTab from '@/components/ai/PlanTab';
import RecordsTab from '@/components/ai/RecordsTab';

// ==============================|| AI PAGE CLIENT ||============================== //

export default function AIPageClient() {
  const [activeTab, setActiveTab] = useState('soap');

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'soap' && <SOAPTab />}
          {activeTab === 'plan' && <PlanTab />}
          {activeTab === 'records' && <RecordsTab />}
        </div>
      </div>
    </div>
  );
}


