// LoginPage.jsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../Services/firebaseConfig';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  
  // useNavigate hook for redirection.
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // After successful login, navigate to the admin page.
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a2635] px-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-md w-full">
        {/* Header Section */}
        <div className="bg-[#ea6001] p-6">
          <h2 className="text-3xl font-bold text-white text-center">Welcome Back</h2>
        </div>
        {/* Form Section */}
        <div className="p-6">
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-gray-700 text-sm font-semibold mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea6001] focus:border-transparent"
                required
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-gray-700 text-sm font-semibold mb-2"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ea6001] focus:border-transparent"
                required
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-[#ea6001] hover:bg-[#d94d00] text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-[#ea6001] transition duration-150 ease-in-out"
              >
                Sign In
              </button>
              <a href="#" className="text-sm text-[#ea6001] hover:underline">
                Forgot Password?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
