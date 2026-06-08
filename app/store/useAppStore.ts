'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Project, Storyboard, Equipment, Template, Part, Shot } from '../lib/types';
import { getInitialState } from '../lib/demo-data';

interface AppStore extends AppState {
  // Theme & Language
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (lang: 'ar' | 'en') => void;

  // Projects
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;

  // Storyboards
  addStoryboard: (sb: Omit<Storyboard, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateStoryboard: (id: string, updates: Partial<Storyboard>) => void;
  deleteStoryboard: (id: string) => void;

  // Parts
  addPart: (storyboardId: string, part: Omit<Part, 'id'>) => void;
  updatePart: (storyboardId: string, partId: string, updates: Partial<Part>) => void;
  deletePart: (storyboardId: string, partId: string) => void;
  reorderParts: (storyboardId: string, parts: Part[]) => void;

  // Shots
  addShot: (storyboardId: string, partId: string, shot: Omit<Shot, 'id'>) => void;
  updateShot: (storyboardId: string, partId: string, shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (storyboardId: string, partId: string, shotId: string) => void;
  reorderShots: (storyboardId: string, partId: string, shots: Shot[]) => void;

  // Equipment
  addEquipment: (eq: Omit<Equipment, 'id'>) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;

  // Templates
  addTemplate: (tmpl: Omit<Template, 'id' | 'createdAt'>) => void;
  deleteTemplate: (id: string) => void;
}

function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...getInitialState(),
      theme: 'dark',
      language: 'ar',

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),

      addProject: (project) => {
        const id = genId();
        set((s) => ({
          projects: [...s.projects, {
            ...project, id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]
        }));
        return id;
      },
      updateProject: (id, updates) => set((s) => ({
        projects: s.projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
      })),
      deleteProject: (id) => set((s) => ({
        projects: s.projects.filter(p => p.id !== id),
        storyboards: s.storyboards.filter(sb => sb.projectId !== id),
      })),
      duplicateProject: (id) => {
        const project = get().projects.find(p => p.id === id);
        if (!project) return;
        const newId = genId();
        set((s) => ({
          projects: [...s.projects, {
            ...project, id: newId,
            name: project.name + ' (نسخة)',
            storyboardIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]
        }));
      },

      addStoryboard: (sb) => {
        const id = genId();
        set((s) => ({
          storyboards: [...s.storyboards, {
            ...sb, id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }]
        }));
        return id;
      },
      updateStoryboard: (id, updates) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === id ? { ...sb, ...updates, updatedAt: new Date().toISOString() } : sb)
      })),
      deleteStoryboard: (id) => set((s) => ({
        storyboards: s.storyboards.filter(sb => sb.id !== id)
      })),

      addPart: (storyboardId, part) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? { ...sb, parts: [...sb.parts, { ...part, id: genId() }], updatedAt: new Date().toISOString() }
          : sb)
      })),
      updatePart: (storyboardId, partId, updates) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? {
            ...sb,
            parts: sb.parts.map(p => p.id === partId ? { ...p, ...updates } : p),
            updatedAt: new Date().toISOString()
          }
          : sb)
      })),
      deletePart: (storyboardId, partId) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? { ...sb, parts: sb.parts.filter(p => p.id !== partId), updatedAt: new Date().toISOString() }
          : sb)
      })),
      reorderParts: (storyboardId, parts) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? { ...sb, parts, updatedAt: new Date().toISOString() }
          : sb)
      })),

      addShot: (storyboardId, partId, shot) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? {
            ...sb,
            parts: sb.parts.map(p => p.id === partId
              ? { ...p, shots: [...p.shots, { ...shot, id: genId() }] }
              : p),
            updatedAt: new Date().toISOString()
          }
          : sb)
      })),
      updateShot: (storyboardId, partId, shotId, updates) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? {
            ...sb,
            parts: sb.parts.map(p => p.id === partId
              ? { ...p, shots: p.shots.map(sh => sh.id === shotId ? { ...sh, ...updates } : sh) }
              : p),
            updatedAt: new Date().toISOString()
          }
          : sb)
      })),
      deleteShot: (storyboardId, partId, shotId) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? {
            ...sb,
            parts: sb.parts.map(p => p.id === partId
              ? { ...p, shots: p.shots.filter(sh => sh.id !== shotId) }
              : p),
            updatedAt: new Date().toISOString()
          }
          : sb)
      })),
      reorderShots: (storyboardId, partId, shots) => set((s) => ({
        storyboards: s.storyboards.map(sb => sb.id === storyboardId
          ? {
            ...sb,
            parts: sb.parts.map(p => p.id === partId ? { ...p, shots } : p),
            updatedAt: new Date().toISOString()
          }
          : sb)
      })),

      addEquipment: (eq) => set((s) => ({
        equipment: [...s.equipment, { ...eq, id: genId() }]
      })),
      updateEquipment: (id, updates) => set((s) => ({
        equipment: s.equipment.map(e => e.id === id ? { ...e, ...updates } : e)
      })),
      deleteEquipment: (id) => set((s) => ({
        equipment: s.equipment.filter(e => e.id !== id)
      })),

      addTemplate: (tmpl) => set((s) => ({
        templates: [...s.templates, { ...tmpl, id: genId(), createdAt: new Date().toISOString() }]
      })),
      deleteTemplate: (id) => set((s) => ({
        templates: s.templates.filter(t => t.id !== id)
      })),
    }),
    {
      name: 'storyboard-dashboard-v1',
    }
  )
);
