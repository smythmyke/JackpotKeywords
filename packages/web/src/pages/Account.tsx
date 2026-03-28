export default function Account() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-white mb-8">Account</h1>

      {/* TODO: Show user profile, plan, credit balance, saved searches */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
        <p className="text-gray-400 mb-4">Sign in to view your account, saved searches, and credits.</p>
        <button className="bg-jackpot-500 hover:bg-jackpot-600 text-black font-bold px-6 py-3 rounded-xl transition">
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
