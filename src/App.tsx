import { useState } from 'react';
import VoiceChat from './components/VoiceChat';
import { MessageSquare } from 'lucide-react';

interface UserInfo {
  name: string;
  gender: string;
}

function App() {
  const [showChat, setShowChat] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const handleStartChat = () => {
    setShowForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const gender = formData.get('gender') as string;

    if (name && gender) {
      setUserInfo({ name: name.trim(), gender });
      setShowChat(true);
      setShowForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {!showChat ? (
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          {!showForm ? (
            <>
              <header className="mb-12 text-center">
                <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Friendly AI Chat</h1>
                <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
                  Have a natural voice conversation with your AI companion.
                </p>
              </header>

              <div className="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
                <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Ready to chat?</h2>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                  Start a relaxed, real-time conversation and hear responses instantly.
                </p>
                <button
                  onClick={handleStartChat}
                  className="mt-8 inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Start Chatting
                </button>
              </div>
            </>
          ) : (
            <div className="mx-auto max-w-md">
              <div className="rounded-3xl border border-slate-100 bg-white px-6 py-10 shadow-sm sm:px-10">
                <h2 className="mb-6 text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Let's get started
                </h2>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your name"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className="mb-2 block text-sm font-medium text-slate-700">
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      required
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        userInfo && <VoiceChat onClose={() => setShowChat(false)} userName={userInfo.name} userGender={userInfo.gender} />
      )}
    </div>
  );
}

export default App;
