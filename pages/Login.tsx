import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulation } from '../contexts/SimulationContext';
import { KeyRound, ArrowRight, ShieldCheck, Chrome } from 'lucide-react';

const Login: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loginWithGoogle();
      const role = result?.role;

      if (role === 'FACILITATOR') {
        navigate('/facilitator/classes');
      } else if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Google login failed', err);
      if (err?.code === 'auth/popup-blocked') {
        setError('Google login popup was blocked. Please enable popups in your browser settings and try again.');
      } else if (err?.code === 'auth/operation-not-supported-in-this-environment' || err?.code === 'auth/auth-domain-config-required') {
        setError('Google Sign-In is not supported in this preview browser. Please use your Access Code instead.');
      } else {
        setError(err?.message || 'Google login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Techtabs Sim</h1>
          <p className="text-blue-100 mt-2">Enter your access code to begin</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
                Access Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="code"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors uppercase tracking-widest font-mono placeholder:normal-case placeholder:tracking-normal"
                  placeholder="e.g. FAC-1234 or TM1-5678"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></span>{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? 'Authenticating...' : (
                <>
                  Enter Simulation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
          >
            <Chrome className="mr-2 h-5 w-5 text-red-500" />
            Sign in with Google
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Demo Code:</strong><br />
              Student: <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-1 rounded">DEMO-STUDENT</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;