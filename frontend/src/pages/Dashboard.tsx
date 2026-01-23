import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Settings, LogOut, Users, UserPlus, X, Github, FolderKanban, Code2, Video, Calendar as CalendarIcon, Palette } from 'lucide-react';
import { PageLayout } from '@/components/nexus/PageLayout';
import { GoogleMeetScheduler } from '@/components/nexus/GoogleMeetScheduler';
import { Calendar } from '@/components/nexus/Calendar';
import DesignCanvas from './components/DesignCanvas';
import DesignList from './components/DesignList';
import { motion } from 'framer-motion';

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
  const [createGitHubRepo, setCreateGitHubRepo] = useState(false);
  const [githubRepoPrivate, setGithubRepoPrivate] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);
  const [showMeetScheduler, setShowMeetScheduler] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'projects' | 'teams' | 'designs'>('projects');
  const [selectedDesignId, setSelectedDesignId] = useState<string | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  useEffect(() => {
    loadData();
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      const response = await api.get('/users/me');
      const userData = response.data.data.user;
      setGithubConnected(!!userData.githubUsername);
    } catch (error) {
      // Ignore
    }
  };

  const loadData = async () => {
    try {
      const [teamsRes, projectsRes] = await Promise.all([
        api.get('/teams'),
        api.get('/projects'),
      ]);
      setTeams(teamsRes.data.data.teams);
      setProjects(projectsRes.data.data.projects);
      
      // Load all designs from all projects
      const allDesigns: any[] = [];
      for (const project of projectsRes.data.data.projects) {
        try {
          const designsRes = await api.get(`/designs/projects/${project.id}`);
          if (designsRes.data.success && designsRes.data.data.designs) {
            designsRes.data.data.designs.forEach((design: any) => {
              allDesigns.push({ ...design, projectName: project.name, projectId: project.id });
            });
          }
        } catch (error) {
          // Ignore projects without designs
        }
      }
      setDesigns(allDesigns);
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

    // Check if user wants to create GitHub repo but is not connected
    if (createGitHubRepo && !githubConnected) {
      toast.error('Please connect your GitHub account first in Settings');
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
        createGitHubRepo,
        githubRepoPrivate,
      });
      
      if (createGitHubRepo && response.data.data.githubRepo) {
        toast.success('Project and GitHub repository created successfully!');
      } else if (createGitHubRepo) {
        toast.success('Project created, but GitHub repo creation failed. You can create it later.');
      } else {
        toast.success('Project created successfully');
      }
      
      setShowCreateProject(false);
      setProjectName('');
      setProjectDescription('');
      setProjectType('');
      setSelectedTeamId('');
      setCreateGitHubRepo(false);
      setGithubRepoPrivate(true);
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
    
    const emailToSearch = memberEmail.trim().toLowerCase();
    
    try {
      // Search for user by email (case-insensitive)
      const searchResponse = await api.get(`/users/search?email=${encodeURIComponent(emailToSearch)}`);
      const users = searchResponse.data?.data?.users || [];
      
      if (users.length === 0) {
        toast.error('User not found. Please make sure the user is registered with this email address.');
        return;
      }

      // Find exact match (case-insensitive)
      const foundUser = users.find((u: any) => u.email.toLowerCase() === emailToSearch);
      if (!foundUser) {
        toast.error('User not found. Please make sure the email is correct.');
        return;
      }

      // Check if user is already a member
      const team = teams.find(t => t.id === teamId);
      if (team?.members?.some(m => m.user.id === foundUser.id)) {
        toast.error('User is already a member of this team');
        return;
      }

      await api.post(`/teams/${teamId}/members`, {
        userId: foundUser.id,
        role: 'member',
        pushMode: 'MANUAL',
      });
      
      toast.success(`Member ${foundUser.name} added successfully`);
      setShowAddMember(false);
      setMemberEmail('');
      loadData();
    } catch (error: any) {
      console.error('Error adding member:', error);
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      if (errorMessage.includes('already a member')) {
        toast.error('User is already a member of this team');
      } else if (errorMessage.includes('not found')) {
        toast.error('User not found. Please make sure the user is registered with this email address.');
      } else {
        toast.error(errorMessage || 'Failed to add member. Please try again.');
      }
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
    <PageLayout>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-surface/95 backdrop-blur-xl border-b-2 border-gray-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-3">
              <Code2 className="w-8 h-8 text-collab-400" />
              <span className="text-2xl font-black text-white">
                Collab<span className="bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">Stack</span>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.name}</span>
              <button
                onClick={() => setShowMeetScheduler(true)}
                className="px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Meet
              </button>
              <button
                onClick={() => setShowCalendar(true)}
                className="px-4 py-2 bg-gray-800/50 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <CalendarIcon className="w-4 h-4" />
                Calendar
              </button>
              <Link
                to="/compute"
                className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Compute
              </Link>
              <Link
                to="/settings"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700/50">
          <nav className="flex space-x-8">
            <button
              onClick={() => {
                setShowTeams(false);
                setSelectedTab('projects');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'projects'
                  ? 'border-collab-400 text-collab-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => {
                setShowTeams(true);
                setSelectedTab('teams');
                loadData();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === 'teams'
                  ? 'border-collab-400 text-collab-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => {
                setShowTeams(false);
                setSelectedTab('designs');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                selectedTab === 'designs'
                  ? 'border-collab-400 text-collab-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Palette className="w-4 h-4" />
              Designs
            </button>
          </nav>
        </div>

        <div className="mb-8 flex justify-between items-center">
          <h2 className="text-3xl font-black bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">
            {selectedTab === 'teams' ? 'My Teams' : selectedTab === 'designs' ? 'My Designs' : 'My Projects'}
          </h2>
          <div className="flex items-center gap-3">
            {showTeams ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateTeam(true)}
                className="px-6 py-3 bg-gradient-to-br from-gray-700/80 to-gray-800/80 backdrop-blur-sm border border-gray-600/50 text-white rounded-xl hover:border-collab-500/50 hover:shadow-lg hover:shadow-collab-500/20 transition-all flex items-center gap-2 font-semibold group"
              >
                <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Create Team
              </motion.button>
            ) : selectedTab === 'designs' ? (
              <>
                {projects.length > 0 && (
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
                    className="px-4 py-2.5 bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-collab-500 focus:border-collab-500/50 transition-all"
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
                {selectedProjectId && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedDesignId('new');
                      setSelectedProjectId(selectedProjectId);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-collab-500 via-purple-500 to-pink-500 text-white rounded-xl hover:shadow-xl hover:shadow-pink-500/30 transition-all flex items-center gap-2 font-bold text-sm group relative overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-collab-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    <Plus className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform" />
                    <span className="relative z-10">New Design</span>
                  </motion.button>
                )}
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateTeam(true)}
                  className="px-6 py-3 bg-gradient-to-br from-gray-700/80 to-gray-800/80 backdrop-blur-sm border border-gray-600/50 text-white rounded-xl hover:border-collab-500/50 hover:shadow-lg hover:shadow-collab-500/20 transition-all flex items-center gap-2 font-semibold group"
                >
                  <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Create Team
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateProject(true)}
                  className="px-7 py-3.5 bg-gradient-to-r from-collab-500 via-purple-500 to-pink-500 text-white rounded-xl hover:shadow-xl hover:shadow-pink-500/30 transition-all flex items-center gap-2.5 font-bold text-base group relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-collab-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <Plus className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform" />
                  <span className="relative z-10">New Project</span>
                </motion.button>
              </>
            )}
          </div>
        </div>

        {showTeams ? (
          teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No teams yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Create a team to start collaborating!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-dark-surface/90 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl shadow-lg hover:shadow-2xl hover:border-collab-500/50 transition-all duration-200 p-6 h-full flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{team.name}</h3>
                      {team.description && (
                        <p className="text-sm text-gray-400 mb-2">{team.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
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
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
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
                          className="text-collab-400 hover:text-collab-300"
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
        ) : selectedTab === 'designs' ? (
          selectedDesignId ? (
            <div className="fixed inset-0 z-50 bg-gray-900">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-700/50 flex items-center justify-between bg-gray-800">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-collab-400" />
                    Design Workspace
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedDesignId(undefined);
                      setSelectedProjectId(undefined);
                      loadData();
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  {selectedProjectId && (
                    <DesignCanvas
                      projectId={selectedProjectId}
                      designId={selectedDesignId === 'new' ? undefined : selectedDesignId}
                      onClose={() => {
                        setSelectedDesignId(undefined);
                        setSelectedProjectId(undefined);
                        loadData();
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : selectedProjectId ? (
            <DesignList
              projectId={selectedProjectId}
              onSelectDesign={(id) => {
                setSelectedDesignId(id);
              }}
              onCreateNew={() => {
                setSelectedDesignId('new');
              }}
            />
          ) : designs.length === 0 ? (
            <div className="text-center py-12">
              <Palette className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No designs yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Select a project above to create your first design!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((design) => (
                <button
                  key={design.id}
                  onClick={() => {
                    setSelectedProjectId(design.projectId);
                    setSelectedDesignId(design.id);
                  }}
                  className="bg-dark-surface/90 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl shadow-lg hover:shadow-2xl hover:border-collab-500/50 transition-all duration-200 p-6 h-full flex flex-col text-left"
                >
                  <div className="aspect-video bg-gray-800/50 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {design.thumbnail ? (
                      <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover" />
                    ) : (
                      <Palette className="w-16 h-16 text-gray-600" />
                    )}
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-pink-400" />
                      <h3 className="text-lg font-bold text-white truncate">{design.name}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-1">Project: {design.projectName}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-700/50 mt-auto">
                    <span className="text-xs font-medium text-gray-400">{design.user?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(design.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No projects yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Create your first project to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="bg-dark-surface/90 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl shadow-lg hover:shadow-2xl hover:border-collab-500/50 transition-all duration-200 p-6 h-full flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-collab-400" />
                    <h3 className="text-lg font-bold text-white">{project.name}</h3>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                  <span className="text-xs font-medium text-gray-400">{project.ownerTeam.name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {project.languages && project.languages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {project.languages.slice(0, 3).map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs bg-collab-500/20 text-collab-300 rounded"
                      >
                        {lang}
                      </span>
                    ))}
                    {project.languages.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-gray-500">
                        +{project.languages.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">Create Team</h3>
              <button
                onClick={() => setShowCreateTeam(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Team Name</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Description</label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                    rows={3}
                    placeholder="Team description (optional)"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all font-semibold"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-collab-400 to-pink-400 bg-clip-text text-transparent">Create Project</h3>
              <button
                onClick={() => setShowCreateProject(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Project Name</label>
                  <input
                    type="text"
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Description</label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                    rows={3}
                    placeholder="e.g., React web app, Flutter mobile app, Node.js backend..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tip: Mention project type (React, Flutter, Android, etc.) to auto-generate folder structure
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Project Type (Optional)</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
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
                  <label className="block text-sm font-semibold mb-2 text-gray-300">Team</label>
                  <select
                    required
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-collab-500"
                  >
                    <option value="">Select a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* GitHub Repository Creation */}
                <div className="border-t border-gray-700/50 pt-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="createGitHubRepo"
                      checked={createGitHubRepo}
                      onChange={(e) => setCreateGitHubRepo(e.target.checked)}
                      disabled={!githubConnected}
                      className="mt-1 h-4 w-4 text-collab-500 focus:ring-collab-500 border-gray-700 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="createGitHubRepo" className="block text-sm font-semibold text-gray-300">
                        <div className="flex items-center gap-2">
                          <Github className="w-4 h-4" />
                          Create GitHub Repository
                        </div>
                      </label>
                      {!githubConnected && (
                        <p className="mt-1 text-xs text-amber-400">
                          Connect your GitHub account in Settings first
                        </p>
                      )}
                      {createGitHubRepo && githubConnected && (
                        <div className="mt-2 space-y-2">
                          <label className="flex items-center space-x-2 text-sm text-gray-400">
                            <input
                              type="radio"
                              checked={githubRepoPrivate}
                              onChange={() => setGithubRepoPrivate(true)}
                              className="h-3 w-3 text-collab-500"
                            />
                            <span>Private Repository</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm text-gray-400">
                            <input
                              type="radio"
                              checked={!githubRepoPrivate}
                              onChange={() => setGithubRepoPrivate(false)}
                              className="h-3 w-3 text-collab-500"
                            />
                            <span>Public Repository</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProject(false)}
                  className="px-6 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-collab-500/50 transition-all font-semibold"
                >
                  Create Project
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
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedTeam(null);
                  setMemberEmail('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddMember(selectedTeam.id)}
                className="px-4 py-2 bg-gradient-to-r from-collab-500 to-pink-500 text-white rounded-md hover:shadow-lg hover:shadow-collab-500/50 transition-all font-semibold"
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

      {/* Google Meet Scheduler Modal */}
      {showMeetScheduler && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <GoogleMeetScheduler
              onClose={() => setShowMeetScheduler(false)}
            />
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <Calendar />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowCalendar(false)}
                className="px-6 py-2 bg-gray-800/50 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

