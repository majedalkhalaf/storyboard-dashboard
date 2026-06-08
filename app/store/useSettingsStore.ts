'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CAMERAS, ALL_LENSES, SHOT_TYPES, CAMERA_MOVEMENTS,
  CAMERA_ANGLES, LIGHTING_OPTIONS, LOCATIONS, MOODS
} from '../lib/constants';

export interface SettingItem {
  id: string;
  value: string;
  isActive: boolean;
  isCustom: boolean; // user-added vs built-in
}

export interface SettingsState {
  cameras: SettingItem[];
  lenses: SettingItem[];
  shotTypes: SettingItem[];
  cameraMovements: SettingItem[];
  cameraAngles: SettingItem[];
  lightingOptions: SettingItem[];
  locations: SettingItem[];
  moods: SettingItem[];
  audioTypes: SettingItem[];
}

function toItems(arr: string[], isCustom = false): SettingItem[] {
  return arr.map(v => ({
    id: Math.random().toString(36).substr(2, 9),
    value: v,
    isActive: true,
    isCustom,
  }));
}

const DEFAULT_AUDIO = ['Voiceover', 'Dialogue', 'Ambient Sound', 'Music', 'Sound Effects', 'Silent', 'Mixed Audio'];

interface SettingsStore extends SettingsState {
  // Generic CRUD for any category
  addItem: (cat: keyof SettingsState, value: string) => void;
  updateItem: (cat: keyof SettingsState, id: string, value: string) => void;
  toggleItem: (cat: keyof SettingsState, id: string) => void;
  deleteItem: (cat: keyof SettingsState, id: string) => void;
  resetCategory: (cat: keyof SettingsState) => void;

  // Getters
  getActive: (cat: keyof SettingsState) => string[];
}

function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      cameras: toItems(CAMERAS),
      lenses: toItems(ALL_LENSES),
      shotTypes: toItems(SHOT_TYPES),
      cameraMovements: toItems(CAMERA_MOVEMENTS),
      cameraAngles: toItems(CAMERA_ANGLES),
      lightingOptions: toItems(LIGHTING_OPTIONS),
      locations: toItems(LOCATIONS),
      moods: toItems(MOODS),
      audioTypes: toItems(DEFAULT_AUDIO),

      addItem: (cat, value) => {
        if (!value.trim()) return;
        set(s => ({
          [cat]: [
            ...s[cat],
            { id: genId(), value: value.trim(), isActive: true, isCustom: true }
          ]
        } as any));
      },

      updateItem: (cat, id, value) => {
        set(s => ({
          [cat]: (s[cat] as SettingItem[]).map(item =>
            item.id === id ? { ...item, value } : item
          )
        } as any));
      },

      toggleItem: (cat, id) => {
        set(s => ({
          [cat]: (s[cat] as SettingItem[]).map(item =>
            item.id === id ? { ...item, isActive: !item.isActive } : item
          )
        } as any));
      },

      deleteItem: (cat, id) => {
        set(s => ({
          [cat]: (s[cat] as SettingItem[]).filter(item => item.id !== id)
        } as any));
      },

      resetCategory: (cat) => {
        const defaults: Record<keyof SettingsState, string[]> = {
          cameras: CAMERAS,
          lenses: ALL_LENSES,
          shotTypes: SHOT_TYPES,
          cameraMovements: CAMERA_MOVEMENTS,
          cameraAngles: CAMERA_ANGLES,
          lightingOptions: LIGHTING_OPTIONS,
          locations: LOCATIONS,
          moods: MOODS,
          audioTypes: DEFAULT_AUDIO,
        };
        set({ [cat]: toItems(defaults[cat]) } as any);
      },

      getActive: (cat) => {
        return (get()[cat] as SettingItem[]).filter(i => i.isActive).map(i => i.value);
      },
    }),
    { name: 'storyboard-settings-v1' }
  )
);
