import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Users } from 'lucide-react';

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Dutch',
  'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish', 'Czech',
  'Hungarian', 'Romanian', 'Bulgarian', 'Greek', 'Turkish', 'Hebrew'
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CLIENT',
    languages: []
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLanguageChange = (language) => {
    const updatedLanguages = formData.languages.includes(language)
      ? formData.languages.filter(lang => lang !== language)
      : [...formData.languages, language];
    
    setFormData({
      ...formData,
      languages: updatedLanguages
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.role === 'FREELANCER' && formData.languages.length === 0) {
      setError('Please select at least one language you can translate');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...registrationData } = formData;
    const result = await register(registrationData);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to existing account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">
                Full name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                I want to:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  formData.role === 'CLIENT' ? 'border-primary-600 ring-2 ring-primary-600' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="CLIENT"
                    className="sr-only"
                    checked={formData.role === 'CLIENT'}
                    onChange={handleChange}
                  />
                  <div className="flex flex-col items-center">
                    <Users className="h-6 w-6 text-gray-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Hire Translators</span>
                    <span className="text-xs text-gray-500">Post projects</span>
                  </div>
                </label>
                <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  formData.role === 'FREELANCER' ? 'border-primary-600 ring-2 ring-primary-600' : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value="FREELANCER"
                    className="sr-only"
                    checked={formData.role === 'FREELANCER'}
                    onChange={handleChange}
                  />
                  <div className="flex flex-col items-center">
                    <User className="h-6 w-6 text-gray-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Work as Translator</span>
                    <span className="text-xs text-gray-500">Find projects</span>
                  </div>
                </label>
              </div>
            </div>

            {formData.role === 'FREELANCER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages you can translate to:
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {LANGUAGES.map((language) => (
                      <label key={language} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.languages.includes(language)}
                          onChange={() => handleLanguageChange(language)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{language}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
