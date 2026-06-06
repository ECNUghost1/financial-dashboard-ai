import React from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { RecordForm } from '../components/Form/RecordForm';

export const EditRecord: React.FC = () => {
  return (
    <DashboardLayout>
      <RecordForm type="edit" />
    </DashboardLayout>
  );
};
