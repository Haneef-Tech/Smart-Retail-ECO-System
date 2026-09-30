import Link from 'next/link'

export default function AdminForbidden() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-5xl font-black text-gray-200">403</p>
        <h1 className="text-lg font-bold text-gray-900 mt-2">Access denied</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your account does not have permission to view the admin panel.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors"
        >
          Back to store
        </Link>
      </div>
    </div>
  )
}
