import RecordDetailPage from '@/views/ai/RecordDetailPage';

// ==============================|| RECORD DETAIL PAGE ||============================== //

export default async function RecordDetail({ params }) {
  const { id } = await params;
  return <RecordDetailPage recordId={id} />;
}

