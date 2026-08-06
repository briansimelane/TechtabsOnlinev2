import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../contexts/SimulationContext';
import { KeyRound, ArrowRight, ShieldCheck, X, Lock, UserCheck } from 'lucide-react';

const Login: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Admin / Facilitator Modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const { login, loginWithGoogle } = useSimulation();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    try {
      const result = await login(code.trim());
      if (result.success) {
        if (result.role === 'FACILITATOR') {
          navigate('/facilitator/classes');
        } else if (result.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login failed', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCode.trim()) return;

    setAdminLoading(true);
    setAdminError('');
    try {
      const result = await login(adminCode.trim());
      if (result.success) {
        setIsAdminModalOpen(false);
        if (result.role === 'FACILITATOR') {
          navigate('/facilitator/classes');
        } else if (result.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setAdminError(result.message || 'Invalid facilitator or admin access code');
      }
    } catch (err) {
      console.error('Admin login failed', err);
      setAdminError('Login failed. Please verify credentials and try again.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      const result = await loginWithGoogle();
      if (result && result.success) {
        setIsAdminModalOpen(false);
        if (result.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/facilitator/classes');
        }
      } else {
        setAdminError(result?.message || 'Access denied: Google account is not registered as a facilitator or administrator.');
      }
    } catch (err: any) {
      console.error('Google Sign-In error', err);
      setAdminError(err.message || 'Google Sign-In failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Techtabs Sim</h1>
          <p className="text-blue-100 mt-2">Enter your student access code to begin</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-slate-700 mb-2">
                Access Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="code"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors uppercase tracking-widest font-mono placeholder:normal-case placeholder:tracking-normal font-bold text-slate-800"
                  placeholder="e.g. TM1-5678"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center font-medium">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></span>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? 'Authenticating...' : (
                <>
                  Enter Simulation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Admin / Facilitator Button */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAdminModalOpen(true);
                setAdminError('');
              }}
              className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 px-4 py-2.5 rounded-full transition-all shadow-xs"
            >
              <UserCheck className="w-4 h-4 mr-2 text-blue-600" />
              Log in as Admin / Facilitator
            </button>

            <p className="text-[11px] text-slate-400">
              Demo Code: <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">DEMO-STUDENT</span>
            </p>
          </div>
        </div>
      </div>

      {/* Admin / Facilitator Login Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 rounded-xl border border-blue-400/30 text-blue-400">
                  <Lock size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Admin & Facilitator Access</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Secure authentication for instructors and managers</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {adminError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-start gap-2 leading-relaxed">
                  <span className="w-2 h-2 bg-red-600 rounded-full mt-1 shrink-0"></span>
                  <div>{adminError}</div>
                </div>
              )}

              {/* Option A: Google Sign-In */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Option 1: Google Authentication
                </label>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={adminLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-300 rounded-xl shadow-xs text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all disabled:opacity-60"
                >
                  {/* Google SVG Logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{adminLoading ? 'Authenticating...' : 'Sign in with Google'}</span>
                </button>
                <p className="text-[11px] text-slate-400 mt-2 text-center leading-normal">
                  Only registered facilitator and administrator Google emails are authorized.
                </p>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">
                  OR USE ACCESS CODE
                </span>
              </div>

              {/* Option B: Code / Password */}
              <form onSubmit={handleAdminCodeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="adminCode" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Facilitator / Admin Code
                  </label>
                  <input
                    type="text"
                    id="adminCode"
                    className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono tracking-wider uppercase focus:ring-blue-500 focus:border-blue-500 placeholder:normal-case placeholder:tracking-normal font-bold"
                    placeholder="e.g. FAC-5678 or Access Code"
                    value={adminCode}
                    onChange={(e) => {
                      setAdminCode(e.target.value);
                      setAdminError('');
                    }}
                    disabled={adminLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={adminLoading}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {adminLoading ? 'Verifying Code...' : 'Log In to Console'}
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;