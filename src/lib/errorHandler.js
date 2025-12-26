export const isRLSError = (error) => {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';

  return (
    errorMessage.includes('permission') ||
    errorMessage.includes('rls') ||
    errorMessage.includes('policy') ||
    errorCode === '42501' ||
    errorCode === 'PGRST301'
  );
};

export const handleSupabaseError = (error) => {
  if (!error) return null;

  if (isRLSError(error)) {
    return {
      type: 'permission',
      message: '承認が必要です。管理者の承認をお待ちください。',
      shouldRedirect: true,
      redirectTo: '/pending-approval'
    };
  }

  if (error.code === '23505') {
    return {
      type: 'duplicate',
      message: 'このデータは既に登録されています。',
      shouldRedirect: false
    };
  }

  if (error.code === 'PGRST116') {
    return {
      type: 'not_found',
      message: 'データが見つかりませんでした。',
      shouldRedirect: false
    };
  }

  return {
    type: 'unknown',
    message: error.message || 'エラーが発生しました。',
    shouldRedirect: false
  };
};

export const withErrorHandling = async (fn, onError) => {
  try {
    const result = await fn();
    return { data: result, error: null };
  } catch (error) {
    const handledError = handleSupabaseError(error);
    if (onError) {
      onError(handledError);
    }
    return { data: null, error: handledError };
  }
};
