export type ProjectType =
  | 'real-estate' | 'product-commercial' | 'corporate' | 'social-media'
  | 'youtube' | 'interview' | 'drone' | 'documentary' | 'event';

export type ProjectStatus =
  | 'idea' | 'planning' | 'ready' | 'production' | 'editing' | 'completed' | 'archived';

export type ShotStatus = 'draft' | 'ready' | 'filmed' | 'completed';

export type TimeOfDay = 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'golden-hour' | 'sunset' | 'blue-hour' | 'night';

export type Mood = 'luxury' | 'cinematic' | 'elegant' | 'modern' | 'minimal' | 'commercial' | 'dramatic' | 'warm' | 'clean' | 'documentary' | 'premium-real-estate' | 'social-media';

export interface Equipment {
  id: string;
  name: string;
  category: 'cameras' | 'lenses' | 'gimbals' | 'drones' | 'monitors' | 'tripods' | 'sliders' | 'audio' | 'lighting' | 'batteries' | 'memory-cards' | 'filters' | 'accessories';
  quantity: number;
  status: 'available' | 'in-use' | 'maintenance';
  notes?: string;
}

export interface Shot {
  id: string;
  number: number;
  title: string;
  referenceImage?: string;
  description: string;
  voiceOver?: string;
  duration: number; // seconds
  camera?: string;
  lens?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  shotType?: string;
  lighting?: string;
  equipment: string[];
  location?: string;
  timeOfDay?: TimeOfDay;
  mood?: Mood;
  directorNotes?: string;
  status: ShotStatus;
}

export interface Part {
  id: string;
  number: number;
  title: string;
  description?: string;
  shots: Shot[];
}

export interface Storyboard {
  id: string;
  title: string;
  projectId: string;
  videoNumber: string;
  videoDuration: number; // minutes
  objective: string;
  targetAudience?: string;
  script?: string;
  voiceOver?: string;
  directorNotes?: string;
  parts: Part[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  type: ProjectType;
  status: ProjectStatus;
  shootingDate?: string;
  location?: string;
  budget?: number;
  notes?: string;
  storyboardIds: string[];
  equipmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  parts: Omit<Part, 'id'>[];
  createdAt: string;
}

export interface AppState {
  projects: Project[];
  storyboards: Storyboard[];
  equipment: Equipment[];
  templates: Template[];
  theme: 'dark' | 'light';
  language: 'ar' | 'en';
}
