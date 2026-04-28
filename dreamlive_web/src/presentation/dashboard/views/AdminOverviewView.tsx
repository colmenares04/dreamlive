import React from 'react';
import { useAdminData } from '../../admin/hooks/useAdminData';
import { AdminOverviewSection } from '../../admin/sections/AdminOverviewSection';

export function AdminOverviewView() {
  const {
    overview,
    loadingOverview,
    loadOverview,
    purgePendingLeads,
    days,
    setDays
  } = useAdminData();

  return (
    <div className="w-full h-full animate-fade-in">
      <AdminOverviewSection
        overview={overview}
        loading={loadingOverview}
        onRefresh={loadOverview}
        onPurge={purgePendingLeads}
        days={days}
        onDaysChange={setDays}
      />
    </div>
  );
}
