import { Project, Storyboard, Equipment, Template } from './types';

export const DEMO_EQUIPMENT: Equipment[] = [
  { id: 'eq1', name: 'Sony FX3', category: 'cameras', quantity: 1, status: 'available' },
  { id: 'eq2', name: 'Sony A7SIII', category: 'cameras', quantity: 1, status: 'available' },
  { id: 'eq3', name: 'Sony A7IV', category: 'cameras', quantity: 1, status: 'available' },
  { id: 'eq4', name: 'DJI Mavic 3 Pro', category: 'drones', quantity: 1, status: 'available' },
  { id: 'eq5', name: 'DJI RS3 Gimbal', category: 'gimbals', quantity: 1, status: 'available' },
  { id: 'eq6', name: 'Konova Slider 100cm', category: 'sliders', quantity: 1, status: 'available' },
  { id: 'eq7', name: 'SmallHD 702 Monitor', category: 'monitors', quantity: 1, status: 'available' },
  { id: 'eq8', name: 'Rode Wireless GO II', category: 'audio', quantity: 2, status: 'available' },
  { id: 'eq9', name: 'Aputure 600D Key Light', category: 'lighting', quantity: 2, status: 'available' },
  { id: 'eq10', name: 'Manfrotto Tripod', category: 'tripods', quantity: 2, status: 'available' },
];

export const DEMO_STORYBOARD: Storyboard = {
  id: 'sb1',
  projectId: 'p1',
  title: 'فيلا رفال - الستوري بورد الرئيسي',
  videoNumber: 'VID-001',
  videoDuration: 3,
  objective: 'تسويق فيلا فاخرة في حي رفال بالرياض وإبراز مميزاتها المعمارية والداخلية الراقية',
  targetAudience: 'عملاء الفئة الراقية والمستثمرون العقاريون',
  script: 'افتح على مشهد بانورامي جوي للفيلا عند الغروب... ثم انتقال ناعم للواجهة الخارجية... دخول إلى الاستقبال الفخم...',
  voiceOver: 'في قلب الرياض... حيث الفخامة تلتقي بالراحة... فيلا رفال 36... بيت أحلامك',
  directorNotes: 'التركيز على الإضاءة الطبيعية في المشاهد الخارجية. استخدام حركات كاميرا بطيئة وسلسة.',
  parts: [
    {
      id: 'part1',
      number: 1,
      title: 'الافتتاحية - مشاهد جوية',
      description: 'مشاهد درون افتتاحية تُظهر الفيلا والمنطقة المحيطة',
      shots: [
        {
          id: 'shot1', number: 1, title: 'لقطة افتتاحية جوية',
          description: 'طائرة درون تنزل ببطء نحو الفيلا من ارتفاع عالٍ عند الغروب',
          voiceOver: 'في قلب الرياض...',
          duration: 8, camera: 'DJI Mavic', lens: 'Wide Angle Lens',
          cameraAngle: 'Bird Eye', cameraMovement: 'Drone Pull Away',
          shotType: 'Drone Shot', lighting: 'Golden Hour',
          equipment: ['DJI Drone', 'Monitor'], location: 'Drone Area',
          timeOfDay: 'golden-hour', mood: 'luxury',
          directorNotes: 'ارتفاع 100 متر، حركة سلسة جداً', status: 'ready', isCompleted: false
        },
        {
          id: 'shot2', number: 2, title: 'واجهة الفيلا الخارجية',
          description: 'جيمبال يتحرك من اليسار إلى اليمين أمام الواجهة الرئيسية للفيلا',
          duration: 6, camera: 'Sony FX3', lens: '24-70mm',
          cameraAngle: 'Low Angle', cameraMovement: 'Slider Move',
          shotType: 'Establishing Shot', lighting: 'Golden Hour',
          equipment: ['Sony FX3', 'Slider', 'Gimbal'], location: 'Villa Exterior',
          timeOfDay: 'golden-hour', mood: 'luxury',
          status: 'draft', isCompleted: false
        },
      ]
    },
    {
      id: 'part2',
      number: 2,
      title: 'المدخل والاستقبال',
      description: 'دخول فخم إلى الفيلا وتفاصيل الاستقبال',
      shots: [
        {
          id: 'shot3', number: 3, title: 'دخول المدخل الرئيسي',
          description: 'حركة gimbal ببطء من خارج الباب إلى داخل الاستقبال',
          duration: 7, camera: 'Sony A7SIII', lens: '16-35mm',
          cameraAngle: 'Eye Level', cameraMovement: 'Dolly In',
          shotType: 'Tracking Shot', lighting: 'Soft Light',
          equipment: ['Sony A7SIII', 'Gimbal', 'LED Panel'], location: 'Interior',
          timeOfDay: 'afternoon', mood: 'elegant', status: 'draft', isCompleted: false
        },
        {
          id: 'shot4', number: 4, title: 'تفاصيل الثريا والسقف',
          description: 'لقطة علوية للثريا الفاخرة والتصاميم المعمارية للسقف',
          duration: 4, camera: 'Sony FX3', lens: '35mm',
          cameraAngle: 'Overhead', cameraMovement: 'Static',
          shotType: 'Detail Shot', lighting: 'Practical Light',
          equipment: ['Sony FX3', 'Tripod'], location: 'Interior',
          timeOfDay: 'afternoon', mood: 'luxury', status: 'draft', isCompleted: false
        },
      ]
    },
    {
      id: 'part3',
      number: 3,
      title: 'المجلس والصالة',
      description: 'جولة في المجلس والمناطق المعيشية',
      shots: [
        {
          id: 'shot5', number: 5, title: 'المجلس الرئيسي',
          description: 'سلايدر بطيء يُظهر المجلس بالكامل مع الإضاءة الطبيعية',
          duration: 8, camera: 'Sony A7IV', lens: '24mm',
          cameraAngle: 'Eye Level', cameraMovement: 'Slider Move',
          shotType: 'Wide Shot', lighting: 'Natural Light',
          equipment: ['Sony A7IV', 'Slider'], location: 'Majlis',
          timeOfDay: 'morning', mood: 'premium-real-estate', status: 'draft', isCompleted: false
        },
      ]
    },
    {
      id: 'part4',
      number: 4,
      title: 'التفاصيل والديكور',
      description: 'لقطات تفصيلية للتشطيبات والديكور الفاخر',
      shots: [
        {
          id: 'shot6', number: 6, title: 'تفاصيل الرخام والتشطيبات',
          description: 'Macro shot للأرضيات الرخامية وتفاصيل التشطيب',
          duration: 5, camera: 'Sony A7IV', lens: '85mm',
          cameraAngle: '45 Degree Angle', cameraMovement: 'Push In',
          shotType: 'Detail Shot', lighting: 'Key Light',
          equipment: ['Sony A7IV', 'Tripod', 'Softbox'], location: 'Interior',
          timeOfDay: 'noon', mood: 'luxury', status: 'draft', isCompleted: false
        },
      ]
    },
    {
      id: 'part5',
      number: 5,
      title: 'المشهد الختامي',
      description: 'إغلاق سينمائي فاخر للفيديو',
      shots: [
        {
          id: 'shot7', number: 7, title: 'لقطة ختامية جوية',
          description: 'درون يرتفع ويبتعد عن الفيلا عند غروب الشمس',
          duration: 10, camera: 'DJI Mavic', lens: 'Wide Angle Lens',
          cameraAngle: 'Bird Eye', cameraMovement: 'Drone Pull Away',
          shotType: 'Drone Shot', lighting: 'Sunset',
          equipment: ['DJI Drone'], location: 'Drone Area',
          timeOfDay: 'sunset', mood: 'cinematic',
          directorNotes: 'نهاية سينمائية مع غروب الشمس', status: 'draft', isCompleted: false
        },
      ]
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEMO_PROJECT: Project = {
  id: 'p1',
  name: 'Reval Real Estate 36',
  clientName: 'رفال العقارية',
  type: 'real-estate',
  status: 'production',
  shootingDate: '2026-06-20',
  location: 'حي رفال، الرياض',
  budget: 25000,
  notes: 'مشروع فيلا فاخرة في حي رفال. العميل يريد إبراز الواجهة والمجلس والمسبح.',
  storyboardIds: ['sb1'],
  equipmentIds: ['eq1', 'eq2', 'eq3', 'eq4', 'eq5', 'eq6', 'eq7', 'eq8', 'eq9', 'eq10'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEMO_TEMPLATES: Template[] = [
  {
    id: 'tmpl1',
    name: 'Real Estate Commercial',
    description: 'قالب احترافي لتصوير العقارات الفاخرة',
    type: 'real-estate',
    createdAt: new Date().toISOString(),
    parts: [
      { number: 1, title: 'Aerial Opening', description: 'Drone shots', shots: [] },
      { number: 2, title: 'Exterior Shots', description: 'Property facade', shots: [] },
      { number: 3, title: 'Interior Tour', description: 'Room by room walkthrough', shots: [] },
      { number: 4, title: 'Details & Finishes', description: 'Close up details', shots: [] },
      { number: 5, title: 'Closing Scene', description: 'Cinematic ending', shots: [] },
    ]
  },
  {
    id: 'tmpl2',
    name: 'Product Commercial',
    description: 'قالب إعلان منتج احترافي',
    type: 'product-commercial',
    createdAt: new Date().toISOString(),
    parts: [
      { number: 1, title: 'Hero Shot', description: 'Main product reveal', shots: [] },
      { number: 2, title: 'Features Showcase', description: 'Product features', shots: [] },
      { number: 3, title: 'Lifestyle Shots', description: 'Product in use', shots: [] },
      { number: 4, title: 'Call to Action', description: 'Closing with brand', shots: [] },
    ]
  },
  {
    id: 'tmpl3',
    name: 'YouTube Video',
    description: 'قالب فيديو يوتيوب',
    type: 'youtube',
    createdAt: new Date().toISOString(),
    parts: [
      { number: 1, title: 'Intro', description: 'Channel intro', shots: [] },
      { number: 2, title: 'Main Content', description: 'Core video content', shots: [] },
      { number: 3, title: 'B-Roll', description: 'Supporting footage', shots: [] },
      { number: 4, title: 'Outro', description: 'Subscribe CTA', shots: [] },
    ]
  },
];

export function getInitialState() {
  return {
    projects: [DEMO_PROJECT],
    storyboards: [DEMO_STORYBOARD],
    equipment: DEMO_EQUIPMENT,
    templates: DEMO_TEMPLATES,
  };
}
