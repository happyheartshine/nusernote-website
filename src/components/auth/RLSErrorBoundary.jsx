'use client';

import { Component } from 'react';
import { useRouter } from 'next/navigation';

class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (error.message?.includes('permission') || error.message?.includes('RLS') || error.code === '42501' || error.code === 'PGRST301') {
      this.setState({ hasError: true, error });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">承認が必要です</h2>
            <p className="mb-6 text-gray-600">このページにアクセスするには管理者の承認が必要です。</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.router.push('/pending-approval');
              }}
              className="btn btn-primary mb-3 w-full"
            >
              承認待ちページへ
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.router.push('/dashboard/default');
              }}
              className="btn btn-outline-primary w-full"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RLSErrorBoundary({ children }) {
  const router = useRouter();
  return <ErrorBoundaryClass router={router}>{children}</ErrorBoundaryClass>;
}
