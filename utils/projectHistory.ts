// Utility functions for managing project history in localStorage

export interface Project {
  id: string;
  name: string;
  type: "Landing Page" | "Web App" | "Dashboard" | "Portfolio" | "Custom";
  description?: string;
  code?: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
  templateUsed?: string;
}

const STORAGE_KEY = "shipfast_projects";
const RECENT_PROJECTS_KEY = "recentProjects";

/**
 * Save a new project to history
 */
export function saveProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Project {
  const projects = getAllProjects();
  
  const newProject: Project = {
    id: generateId(),
    ...project,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  projects.unshift(newProject); // Add to beginning
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  
  // Update recent projects
  updateRecentProjects(newProject);
  
  return newProject;
}

/**
 * Get all projects
 */
export function getAllProjects(): Project[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const projects = JSON.parse(stored);
    // Convert date strings back to Date objects
    return projects.map((p: Project) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
  } catch (error) {
    console.error("Error loading projects:", error);
    return [];
  }
}

/**
 * Get a project by ID
 */
export function getProject(id: string): Project | null {
  const projects = getAllProjects();
  return projects.find(p => p.id === id) || null;
}

/**
 * Update an existing project
 */
export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects[index];
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  const projects = getAllProjects();
  const filtered = projects.filter(p => p.id !== id);
  
  if (filtered.length === projects.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get recent projects (last 5)
 */
export function getRecentProjects(): Project[] {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!stored) return [];
    
    const projects = JSON.parse(stored);
    return projects.map((p: Project) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    })).slice(0, 5);
  } catch (error) {
    console.error("Error loading recent projects:", error);
    return [];
  }
}

/**
 * Update recent projects list
 */
function updateRecentProjects(project: Project) {
  const recent = getRecentProjects();
  
  // Remove if already exists
  const filtered = recent.filter(p => p.id !== project.id);
  
  // Add to beginning
  filtered.unshift(project);
  
  // Keep only last 5
  const updated = filtered.slice(0, 5);
  
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
}

/**
 * Search projects by name or type
 */
export function searchProjects(query: string): Project[] {
  const projects = getAllProjects();
  const lowerQuery = query.toLowerCase();
  
  return projects.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.type.toLowerCase().includes(lowerQuery) ||
    p.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get projects by type
 */
export function getProjectsByType(type: Project["type"]): Project[] {
  const projects = getAllProjects();
  return projects.filter(p => p.type === type);
}

/**
 * Get project statistics
 */
export function getProjectStats() {
  const projects = getAllProjects();
  
  const stats = {
    total: projects.length,
    byType: {} as Record<string, number>,
    thisWeek: 0,
    thisMonth: 0,
  };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  projects.forEach(project => {
    // Count by type
    stats.byType[project.type] = (stats.byType[project.type] || 0) + 1;
    
    // Count recent projects
    if (project.createdAt > weekAgo) stats.thisWeek++;
    if (project.createdAt > monthAgo) stats.thisMonth++;
  });
  
  return stats;
}

/**
 * Export projects as JSON
 */
export function exportProjects(): string {
  const projects = getAllProjects();
  return JSON.stringify(projects, null, 2);
}

/**
 * Import projects from JSON
 */
export function importProjects(jsonString: string): boolean {
  try {
    const projects = JSON.parse(jsonString);
    
    // Validate structure
    if (!Array.isArray(projects)) return false;
    
    // Merge with existing projects (avoid duplicates by ID)
    const existing = getAllProjects();
    const existingIds = new Set(existing.map(p => p.id));
    
    const newProjects = projects.filter((p: Project) => !existingIds.has(p.id));
    const merged = [...existing, ...newProjects];
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.error("Error importing projects:", error);
    return false;
  }
}

/**
 * Clear all projects (use with caution!)
 */
export function clearAllProjects(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(RECENT_PROJECTS_KEY);
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate time saved estimate (assumes 2 hours per project)
 */
export function calculateTimeSaved(): string {
  const projects = getAllProjects();
  const hours = projects.length * 2;
  
  if (hours < 1) return "Less than an hour";
  if (hours < 24) return `${hours} hours`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""}`;
}
