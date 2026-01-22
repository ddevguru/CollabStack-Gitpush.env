import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Settings, LogOut, Users, UserPlus, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description?: string;
  leader: {
    id: string;
    name: string;
    email: string;
  };
  members?: TeamMember[];
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  languages: string[];
  visibility: string;
  roomId: string;
  createdAt: string;
  ownerTeam: {
    id: string;
    name: string;
  };
}

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectType, setProjectType] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [showTeams, setShowTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showManageTeam, setShowManageTeam] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsRes, projectsRes] = await Promise.all([
        api.get('/teams'),
        api.get('/projects'),
      ]);
      setTeams(teamsRes.data.data.teams);
      setProjects(projectsRes.data.data.projects);
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/teams', {
        name: teamName,
        description: teamDescription,
      });
      toast.success('Team created successfully');
      setShowCreateTeam(false);
      setTeamName('');
      setTeamDescription('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create team');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      toast.error('Please select a team');
      return;
    }
    try {
      const response = await api.post('/projects', {
        name: projectName,
        description: projectDescription,
        projectType: projectType || undefined, // Auto-detect if not provided
        ownerTeamId: selectedTeamId,
        languages: [],
        visibility: 'PRIVATE',
      });
      toast.success('Project created successfully');
      setShowCreateProject(false);
      setProjectName('');
      setProjectDescription('');
      setProjectType('');
      setSelectedTeamId('');
      navigate(`/project/${response.data.data.project.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create project');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAddMember = async (teamId: string) => {
    if (!memberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      // Search for user by email
      const searchResponse = await api.get(`/users/search?email=${encodeURIComponent(memberEmail)}`);
      const users = searchResponse.data.data.users;
      
      if (users.length === 0) {
        toast.error('User not found. Please make sure the user is registered.');
        return;
      }

      const foundUser = users.find((u: any) => u.email.toLowerCase() === memberEmail.toLowerCase());
      if (!foundUser) {
        toast.error('User not found. Please make sure the email is correct.');
        return;
      }

      await api.post(`/teams/${teamId}/members`, {
        userId: foundUser.id,
        role: 'member',
        pushMode: 'MANUAL',
      });
      toast.success('Member added successfully');
      setShowAddMember(false);
      setMemberEmail('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to add member. User must be registered first.');
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      toast.success('Member removed');
      loadData();
    } catch (error: any) {
      toast.error('Failed to remove member');
    }
  };

  const loadTeamDetails = async (teamId: string) => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      const team = response.data.data.team;
      
      // Also load members
      const membersResponse = await api.get(`/teams/${teamId}/members`);
      team.members = membersResponse.data.data.members;
      
      setSelectedTeam(team);
    } catch (error: any) {
      toast.error('Failed to load team details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Collaborative IDE</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">{user?.name}</span>
              <Link
                to="/compute"
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Compute
              </Link>
              <Link
                to="/payment"
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Upgrade
              </Link>
              <Link
                to="/settings"
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setShowTeams(false)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                !showTeams
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => {
                setShowTeams(true);
                loadData();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                showTeams
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'
              }`}
            >
              Teams
            </button>
          </nav>
        </div>

        <div className="mb-8 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {showTeams ? 'My Teams' : 'My Projects'}
          </h2>
          <div className="space-x-2">
            {showTeams ? (
              <button
                onClick={() => setShowCreateTeam(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Team
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Create Team
                </button>
                <button
                  onClick={() => setShowCreateProject(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </>
            )}
          </div>
        </div>

        {showTeams ? (
          teams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No teams yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{team.description}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Leader: {team.leader.name} ({team.leader.email})
                      </p>
                    </div>
                    {team.leader.id === user?.id && (
                      <button
                        onClick={() => {
                          setSelectedTeam(team);
                          loadTeamDetails(team.id);
                          setShowAddMember(true);
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                        title="Add Member"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4 inline mr-1" />
                        {team.members?.length || 0} members
                      </span>
                      {team.leader.id === user?.id && (
                        <button
                          onClick={() => {
                            setSelectedTeam(team);
                            loadTeamDetails(team.id);
                            setShowManageTeam(true);
                          }}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No projects yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-500">{project.ownerTeam.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create Team</h3>
            <form onSubmit={handleCreateTeam}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Team Name</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="e.g., React web app, Flutter mobile app, Node.js backend..."
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Tip: Mention project type (React, Flutter, Android, etc.) to auto-generate folder structure
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Type (Optional)</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Auto-detect from description</option>
                    <option value="react">React</option>
                    <option value="vue">Vue.js</option>
                    <option value="angular">Angular</option>
                    <option value="flutter">Flutter</option>
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                    <option value="nodejs">Node.js</option>
                    <option value="python-web">Python (Django/Flask)</option>
                    <option value="java-web">Java Spring Boot</option>
                    <option value="html-css">HTML/CSS/JS</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                    <option value="generic">Generic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Team</label>
                  <select
                    required
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Member to {selectedTeam.name}
              </h3>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedTeam(null);
                  setMemberEmail('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Email
              </label>
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Note: User must be registered in the system first. Enter their email address.
              </p>
            </div>
            {selectedTeam.members && selectedTeam.members.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Members</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTeam.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{member.user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.user.email}</p>
                      </div>
                      {selectedTeam.leader.id === user?.id && member.user.id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(selectedTeam.id, member.user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedTeam(null);
                  setMemberEmail('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddMember(selectedTeam.id)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Team Modal */}
      {showManageTeam && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manage Team: {selectedTeam.name}
              </h3>
              <button
                onClick={() => {
                  setShowManageTeam(false);
                  setSelectedTeam(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Team Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Information</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Leader:</strong> {selectedTeam.leader.name} ({selectedTeam.leader.email})
                  </p>
                  {selectedTeam.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <strong>Description:</strong> {selectedTeam.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Team Members</h4>
                  <button
                    onClick={() => {
                      setShowAddMember(true);
                    }}
                    className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                </div>

                {selectedTeam.members && selectedTeam.members.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{member.user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{member.user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            {member.role}
                          </span>
                        </div>
                        {selectedTeam.leader.id === user?.id && member.user.id !== user?.id && (
                          <button
                            onClick={() => handleRemoveMember(selectedTeam.id, member.user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Remove Member"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No members yet. Add members to collaborate!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

