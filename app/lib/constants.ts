export const CAMERAS = [
  'Sony FX3', 'Sony A7SIII', 'Sony A7IV', 'RED Komodo', 'RED V-Raptor',
  'Canon C70', 'Canon R5C', 'Blackmagic 6K', 'Blackmagic 12K',
  'DJI Inspire', 'DJI Mavic', 'DJI Air', 'DSLR', 'Mirrorless',
  'Cinema Camera', 'Action Camera', 'Mobile Camera'
];

export const LENSES = {
  prime: ['14mm', '16mm', '20mm', '24mm', '28mm', '35mm', '50mm', '85mm', '100mm', '135mm'],
  zoom: ['16-35mm', '24-70mm', '24-105mm', '70-200mm'],
  specialty: ['Macro Lens', 'Fisheye Lens', 'Tilt Shift Lens', 'Anamorphic Lens', 'Telephoto Lens', 'Wide Angle Lens']
};

export const ALL_LENSES = [...LENSES.prime, ...LENSES.zoom, ...LENSES.specialty];

export const SHOT_TYPES = [
  'Establishing Shot', 'Wide Shot', 'Medium Shot', 'Close Up', 'Extreme Close Up',
  'Detail Shot', 'POV Shot', 'Over The Shoulder', 'Tracking Shot', 'Hero Shot',
  'Product Shot', 'Lifestyle Shot', 'Reveal Shot', 'Drone Shot', 'Top View'
];

export const CAMERA_MOVEMENTS = [
  'Static', 'Push In', 'Pull Out', 'Pan Left', 'Pan Right', 'Tilt Up', 'Tilt Down',
  'Dolly In', 'Dolly Out', 'Slider Move', 'Orbit', 'Crane Up', 'Crane Down',
  'Handheld', 'Gimbal Follow', 'Drone Forward', 'Drone Pull Away', 'Drone Orbit', 'Slow Motion Move'
];

export const CAMERA_ANGLES = [
  'Eye Level', 'Low Angle', 'High Angle', 'Bird Eye', 'Worm Eye', 'Dutch Angle',
  'Overhead', 'Ground Level', 'Side View', 'Front View', 'Rear View', '45 Degree Angle'
];

export const LIGHTING_OPTIONS = [
  'Natural Light', 'Golden Hour', 'Soft Light', 'Hard Light', 'Key Light',
  'Fill Light', 'Back Light', 'Practical Light', 'LED Panel', 'Softbox',
  'Cinematic Contrast', 'Low Key', 'High Key'
];

export const LOCATIONS = [
  'Exterior', 'Interior', 'Villa Exterior', 'Villa Interior', 'Living Room',
  'Majlis', 'Kitchen', 'Bedroom', 'Bathroom', 'Rooftop', 'Garden', 'Parking',
  'Office', 'Studio', 'Product Table', 'Drone Area'
];

export const TIMES_OF_DAY = [
  { value: 'sunrise', label: 'Sunrise', labelAr: 'شروق الشمس' },
  { value: 'morning', label: 'Morning', labelAr: 'الصباح' },
  { value: 'noon', label: 'Noon', labelAr: 'الظهر' },
  { value: 'afternoon', label: 'Afternoon', labelAr: 'بعد الظهر' },
  { value: 'golden-hour', label: 'Golden Hour', labelAr: 'الساعة الذهبية' },
  { value: 'sunset', label: 'Sunset', labelAr: 'الغروب' },
  { value: 'blue-hour', label: 'Blue Hour', labelAr: 'الساعة الزرقاء' },
  { value: 'night', label: 'Night', labelAr: 'الليل' },
];

export const MOODS = [
  'Luxury', 'Cinematic', 'Elegant', 'Modern', 'Minimal', 'Commercial',
  'Dramatic', 'Warm', 'Clean', 'Documentary', 'Premium Real Estate', 'Social Media'
];

export const PROJECT_TYPES = [
  { value: 'real-estate', label: 'Real Estate', labelAr: 'عقارات' },
  { value: 'product-commercial', label: 'Product Commercial', labelAr: 'إعلان منتج' },
  { value: 'corporate', label: 'Corporate', labelAr: 'شركات' },
  { value: 'social-media', label: 'Social Media', labelAr: 'سوشيال ميديا' },
  { value: 'youtube', label: 'YouTube', labelAr: 'يوتيوب' },
  { value: 'interview', label: 'Interview', labelAr: 'مقابلة' },
  { value: 'drone', label: 'Drone Project', labelAr: 'مشروع درون' },
  { value: 'documentary', label: 'Documentary', labelAr: 'وثائقي' },
  { value: 'event', label: 'Event Coverage', labelAr: 'تغطية فعالية' },
];

export const PROJECT_STATUSES = [
  { value: 'idea', label: 'Idea', labelAr: 'فكرة', color: 'text-purple-400' },
  { value: 'planning', label: 'Planning', labelAr: 'تخطيط', color: 'text-blue-400' },
  { value: 'ready', label: 'Ready for Production', labelAr: 'جاهز للتصوير', color: 'text-yellow-400' },
  { value: 'production', label: 'Production', labelAr: 'تصوير', color: 'text-orange-400' },
  { value: 'editing', label: 'Editing', labelAr: 'مونتاج', color: 'text-cyan-400' },
  { value: 'completed', label: 'Completed', labelAr: 'مكتمل', color: 'text-green-400' },
  { value: 'archived', label: 'Archived', labelAr: 'أرشيف', color: 'text-gray-400' },
];

export const SHOT_STATUSES = [
  { value: 'draft', label: 'Draft', labelAr: 'مسودة', color: 'bg-gray-500' },
  { value: 'ready', label: 'Ready', labelAr: 'جاهز', color: 'bg-yellow-500' },
  { value: 'filmed', label: 'Filmed', labelAr: 'تم التصوير', color: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', labelAr: 'مكتمل', color: 'bg-green-500' },
];

export const EQUIPMENT_CATEGORIES = [
  { value: 'cameras', label: 'Cameras', labelAr: 'كاميرات' },
  { value: 'lenses', label: 'Lenses', labelAr: 'عدسات' },
  { value: 'gimbals', label: 'Gimbals', labelAr: 'جيمبال' },
  { value: 'drones', label: 'Drones', labelAr: 'طائرات درون' },
  { value: 'monitors', label: 'Monitors', labelAr: 'شاشات' },
  { value: 'tripods', label: 'Tripods', labelAr: 'حوامل ثلاثية' },
  { value: 'sliders', label: 'Sliders', labelAr: 'سلايدر' },
  { value: 'audio', label: 'Audio', labelAr: 'صوت' },
  { value: 'lighting', label: 'Lighting', labelAr: 'إضاءة' },
  { value: 'batteries', label: 'Batteries', labelAr: 'بطاريات' },
  { value: 'memory-cards', label: 'Memory Cards', labelAr: 'بطاقات ذاكرة' },
  { value: 'filters', label: 'Filters', labelAr: 'فلاتر' },
  { value: 'accessories', label: 'Accessories', labelAr: 'ملحقات' },
];

export const SMART_PRESETS = [
  {
    name: 'Luxury Exterior Shot',
    nameAr: 'لقطة خارجية فاخرة',
    camera: 'Sony FX3',
    lens: '24-70mm',
    movement: 'Gimbal Follow',
    lighting: 'Golden Hour',
    equipment: ['Sony FX3', 'Gimbal', 'Slider'],
    mood: 'Luxury',
    shotType: 'Establishing Shot',
    angle: 'Low Angle',
  },
  {
    name: 'Interior Walkthrough',
    nameAr: 'جولة داخلية',
    camera: 'Sony A7SIII',
    lens: '16-35mm',
    movement: 'Dolly In',
    lighting: 'Soft Light',
    equipment: ['Sony A7SIII', 'Gimbal', 'LED Panel'],
    mood: 'Elegant',
    shotType: 'Tracking Shot',
    angle: 'Eye Level',
  },
  {
    name: 'Hero Product Shot',
    nameAr: 'لقطة المنتج الرئيسية',
    camera: 'Sony A7IV',
    lens: '85mm',
    movement: 'Orbit',
    lighting: 'Key Light',
    equipment: ['Sony A7IV', 'Tripod', 'Softbox'],
    mood: 'Commercial',
    shotType: 'Product Shot',
    angle: '45 Degree Angle',
  },
  {
    name: 'Drone Opening Shot',
    nameAr: 'لقطة افتتاحية بالدرون',
    camera: 'DJI Mavic',
    lens: 'Wide Angle Lens',
    movement: 'Drone Pull Away',
    lighting: 'Golden Hour',
    equipment: ['DJI Drone', 'Monitor'],
    mood: 'Cinematic',
    shotType: 'Drone Shot',
    angle: 'Bird Eye',
  },
  {
    name: 'Cinematic Closing Shot',
    nameAr: 'لقطة ختامية سينمائية',
    camera: 'Sony FX3',
    lens: '50mm',
    movement: 'Crane Up',
    lighting: 'Cinematic Contrast',
    equipment: ['Sony FX3', 'Gimbal'],
    mood: 'Dramatic',
    shotType: 'Wide Shot',
    angle: 'High Angle',
  },
];
