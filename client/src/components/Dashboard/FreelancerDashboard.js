import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Search, FileText, Clock, CheckCircle, DollarSign, Star } from 'lucide-react';

const FreelancerDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [stats, setStats] = useState({
    activeBids: 0,
    acceptedBids: 0,
    completedProjects: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, bidsRes] = await Promise.all([
        api.get('/projects?status=POSTED'),
        api.get('/bids/my-bids')
      ]);

      // Filter projects by user's languages
      const relevantProjects = projectsRes.data.projects.filter(project =>
        user.languages.includes(project.targetLanguage)
      );
      setProjects(relevantProjects);
      setMyBids(bidsRes.data);

      // Calculate stats
      const activeBids = bidsRes.data.filter(bid => bid.status === 'PENDING').length;
      const acceptedBids = bidsRes.data.filter(bid => bid.status === 'ACCEPTED').length;
      const completedProjects = bidsRes.data.filter(bid => 
        bid.project.status === 'COMPLETED' || bid.project.status === 'PAID'
      ).length;
      const totalEarnings = bidsRes.data
        .filter(bid => bid.project.status === 'PAID')
        .reduce((sum, bid) => sum + bid.bidAmount, 0);

      setStats({
        activeBids,
        acceptedBids,
        completedProjects,
        totalEarnings
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
        <p className="text-gray-600">Find new translation projects and manage your bids.</p>
        <div className="mt-2">
          <span className="text-sm text-gray-500">Your languages: </span>
          <span className="text-sm font-medium text-primary-600">
            {user.languages.join(', ')}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Bids</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeBids}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Accepted Bids</p>
              <p className="text-2xl font-bold text-gray-900">{stats.acceptedBids}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalEarnings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/projects"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Search className="h-4 w-4 mr-2" />
              Browse Projects
            </Link>
            <Link
              to="/my-bids"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              My Bids
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Projects */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Available Projects</h2>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No matching projects</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No projects found for your languages. Check back later!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        to={`/projects/${project.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-900"
                      >
                        {project.title}
                      </Link>
                      <span className="text-sm font-medium text-green-600">
                        ${project.budget}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {project.description}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{project.sourceLanguage} → {project.targetLanguage}</span>
                      <span>{project._count?.bids || 0} bids</span>
                    </div>
                  </div>
                ))}
                {projects.length > 3 && (
                  <div className="text-center">
                    <Link
                      to="/projects"
                      className="text-sm text-primary-600 hover:text-primary-900"
                    >
                      View all {projects.length} projects →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bids */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Bids</h2>
            {myBids.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bids yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start bidding on projects to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myBids.slice(0, 3).map((bid) => (
                  <div key={bid.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        to={`/projects/${bid.project.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-900"
                      >
                        {bid.project.title}
                      </Link>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bid.status)}`}>
                        {bid.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Your bid: ${bid.bidAmount}</span>
                      <span>Est. time: {bid.estimatedTime}</span>
                    </div>
                  </div>
                ))}
                {myBids.length > 3 && (
                  <div className="text-center">
                    <Link
                      to="/my-bids"
                      className="text-sm text-primary-600 hover:text-primary-900"
                    >
                      View all {myBids.length} bids →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelancerDashboard;
