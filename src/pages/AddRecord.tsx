import React from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { RecordForm } from '../components/Form/RecordForm';

export const AddRecord: React.FC = () => {
  return (
    <DashboardLayout>
      <RecordForm type="add" />
    </DashboardLayout>
  );
};
