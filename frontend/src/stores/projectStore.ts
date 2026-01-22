import { create } from 'zustand';

interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirectory: boolean;
}

interface Branch {
  name: string;
  isActive: boolean;
  ahead: number;
  behind: number;
}

interface ProjectSettings {
  autoPush: boolean;
  autoBranching: boolean;
  language: string;
  resourceLimits: {
    cpu: string;
    memory: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  files: File[];
  branches: Branch[];
  settings: ProjectSettings;
  githubRepoName?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  selectedFile: File | null;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setSelectedFile: (file: File | null) => void;
  updateFile: (fileId: string, content: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  selectedFile: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  updateFile: (fileId, content) =>
    set((state) => {
      if (!state.currentProject) return state;
      const updatedFiles = state.currentProject.files.map((f) =>
        f.id === fileId ? { ...f, content } : f
      );
      return {
        currentProject: {
          ...state.currentProject,
          files: updatedFiles,
        },
      };
    }),
  updateSettings: (settings) =>
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          settings: { ...state.currentProject.settings, ...settings },
        },
      };
    }),
}));

