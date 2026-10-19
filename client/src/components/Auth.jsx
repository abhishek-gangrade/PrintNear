import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Auth({ initialMode = 'signup', onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [role, setRole] = useState('customer'); // 'customer' or 'shopkeeper'

  // Step state for Registration: 'form' | 'otp' | 'welcome'
  const [authStep, setAuthStep] = useState('form');
  const [otpCode, setOtpCode] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [welcomeUser, setWelcomeUser] = useState(null);

  // Form Inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Shopkeeper Inputs
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Resend OTP countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const resetFormState = () => {
    setAuthStep('form');
    setOtpCode('');
    setDebugOtp('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim()
      };

      if (role === 'shopkeeper') {
        payload.shopName = shopName.trim();
        payload.address = address.trim();
        payload.upiId = upiId.trim();
      }

      const res = await axios.post('/api/auth/send-otp', payload);
      setAuthStep('otp');
      setResendCooldown(60);
      setSuccessMessage(res.data.message || 'Verification code sent to your email.');
      if (res.data.debugOtp) {
        setDebugOtp(res.data.debugOtp);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorMessage('⚠️ This email is already registered. Please sign in instead.');
      } else {
        setErrorMessage(
          err.response?.data?.message || 'Failed to send verification code. Please check your details.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otpCode.trim()
      });

      const user = res.data.user;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(user));

      setWelcomeUser(user);
      setAuthStep('welcome');

      // Automatically transition to dashboard after showing welcome message
      setTimeout(() => {
        if (onAuthSuccess) {
          onAuthSuccess(user);
        }
      }, 3000);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Invalid or expired OTP code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/resend-otp', {
        email: email.trim().toLowerCase()
      });
      setResendCooldown(60);
      setSuccessMessage(res.data.message || 'New verification code sent to your email.');
      if (res.data.debugOtp) {
        setDebugOtp(res.data.debugOtp);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Could not resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await axios.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      if (onAuthSuccess) {
        onAuthSuccess(res.data.user);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Authentication failed. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative font-sans text-slate-900 py-12 px-4 sm:px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-blue-100/50 via-indigo-50/20 to-transparent pointer-events-none -z-10 rounded-full blur-3xl" />

      <div className="max-w-md mx-auto">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Header Brand */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 mb-3">
              P
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isLogin
                ? 'Welcome Back'
                : authStep === 'otp'
                ? 'Verify Your Email'
                : authStep === 'welcome'
                ? 'Welcome to PrintNear!'
                : 'Create an Account'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isLogin
                ? 'Sign in to access your print jobs and dashboard'
                : authStep === 'otp'
                ? `Enter the 6-digit code sent to ${email}`
                : authStep === 'welcome'
                ? 'Your account has been verified and registered'
                : 'Join PrintNear for fast, on-demand campus printing'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl text-center">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl text-center">
              {successMessage}
            </div>
          )}

          {/* STEP 1: WELCOME SCREEN (AFTER SUCCESSFUL OTP VERIFICATION) */}
          {authStep === 'welcome' && welcomeUser && (
            <div className="space-y-5 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner animate-bounce">
                🎉
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-slate-900">
                  Welcome aboard, {welcomeUser.name}!
                </h3>
                <p className="text-xs text-slate-600">
                  Your email <strong className="text-slate-800">{welcomeUser.email}</strong> has been verified. A welcome message has been sent to your inbox.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Role:</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {welcomeUser.role === 'shopkeeper' ? '🏪 Shop Partner' : '🎓 Customer'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verification Status:</span>
                  <span className="font-bold text-emerald-600">✓ Real-time Verified</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAuthSuccess && onAuthSuccess(welcomeUser)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer"
              >
                Continue to Dashboard →
              </button>
            </div>
          )}

          {/* STEP 2: OTP VERIFICATION SCREEN */}
          {!isLogin && authStep === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-center space-y-1">
                <span className="text-2xl block">📬</span>
                <p className="text-xs font-semibold text-blue-900">
                  We've sent a 6-digit OTP code to:
                </p>
                <p className="text-xs font-bold text-blue-700 font-mono">
                  {email}
                </p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Valid for 5 minutes. Check your inbox or spam folder.
                </p>
              </div>

              {debugOtp && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs">
                  <span className="text-amber-800 font-medium">⚡ Testing Code: </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(debugOtp)}
                    className="font-mono font-black text-amber-900 underline hover:text-amber-700 cursor-pointer ml-1"
                  >
                    {debugOtp} (Click to auto-fill)
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full border-2 border-blue-500 rounded-2xl p-3.5 text-center font-mono text-2xl font-black tracking-[0.5em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-md transition cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify Code & Complete Sign Up'}
              </button>

              <div className="flex items-center justify-between pt-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setAuthStep('form')}
                  className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  ← Edit registration details
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className={`font-bold cursor-pointer ${
                    resendCooldown > 0 ? 'text-slate-400' : 'text-blue-600 hover:underline'
                  }`}
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: INITIAL REGISTRATION OR LOGIN FORM */}
          {authStep === 'form' && (
            <>
              {/* Role Selector for Sign Up */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 rounded-xl transition cursor-pointer ${
                      role === 'customer'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎓 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('shopkeeper')}
                    className={`py-2 rounded-xl transition cursor-pointer ${
                      role === 'shopkeeper'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏪 Print Shop
                  </button>
                </div>
              )}

              <form onSubmit={isLogin ? handleLoginSubmit : handleSendOtp} className="space-y-4 text-xs">
                {!isLogin && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Abhishek Gangrade"
                      className="w-full border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition font-mono"
                    />
                  </div>
                )}

                {!isLogin && role === 'shopkeeper' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Shop / Xerox Name
                      </label>
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. FastPrint Xerox"
                        className="w-full border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Shop Address
                      </label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Near Gate 1, Campus Road"
                        className="w-full border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        UPI ID (To Receive Customer Payments)
                      </label>
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. printnear@upi"
                        className="w-full border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 transition font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-2xl text-white font-extrabold text-xs shadow-md transition-all duration-200 cursor-pointer ${
                    role === 'shopkeeper' && !isLogin
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  }`}
                >
                  {loading
                    ? 'Processing...'
                    : isLogin
                    ? 'Sign In to PrintNear'
                    : `Send OTP Verification Code →`}
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      resetFormState();
                    }}
                    className="ml-1.5 font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {isLogin ? 'Create one here' : 'Sign in'}
                  </button>
                </p>
              </div>

              {/* Quick Demo Credentials Fill */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
                  ⚡ Quick Fill Demo Accounts
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      resetFormState();
                      setEmail('demo.customer@printnear.test');
                      setPassword('PrintNearDemo123!');
                    }}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-blue-700 hover:bg-blue-50 transition cursor-pointer text-center"
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      resetFormState();
                      setEmail('demo.vendor@printnear.test');
                      setPassword('PrintNearDemo123!');
                    }}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-emerald-700 hover:bg-emerald-50 transition cursor-pointer text-center"
                  >
                    Vendor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      resetFormState();
                      setEmail('admin@printnear.test');
                      setPassword('PrintNearAdmin123!');
                    }}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 hover:bg-slate-100 transition cursor-pointer text-center"
                  >
                    Admin
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}