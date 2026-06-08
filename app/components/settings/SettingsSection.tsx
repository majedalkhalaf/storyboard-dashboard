'use client';

import { useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CAMERAS, ALL_LENSES, SHOT_TYPES, CAMERA_MOVEMENTS,
  CAMERA_ANGLES, LIGHTING_OPTIONS, LOCATIONS, MOODS
} from '../../lib/constants';

// ── Inline store ──
interface SettingItem { id: string; value: string; isActive: boolean; isCustom: boolean; }
type Category = 'cameras'|'lenses'|'shotTypes'|'cameraMovements'|'cameraAngles'|'lightingOptions'|'locations'|'moods'|'audioTypes';
interface SettingsState { cameras:SettingItem[];lenses:SettingItem[];shotTypes:SettingItem[];cameraMovements:SettingItem[];cameraAngles:SettingItem[];lightingOptions:SettingItem[];locations:SettingItem[];moods:SettingItem[];audioTypes:SettingItem[]; }
interface SettingsStore extends SettingsState { addItem:(cat:Category,value:string)=>void;updateItem:(cat:Category,id:string,value:string)=>void;toggleItem:(cat:Category,id:string)=>void;deleteItem:(cat:Category,id:string)=>void;resetCategory:(cat:Category)=>void;getActive:(cat:Category)=>string[]; }
const DEFAULT_AUDIO = ['Voiceover','Dialogue','Ambient Sound','Music','Sound Effects','Silent','Mixed Audio'];
function toItems(arr:string[]):SettingItem[]{return arr.map(v=>({id:Math.random().toString(36).substr(2,9),value:v,isActive:true,isCustom:false}));}
function genId(){return Math.random().toString(36).substr(2,9)+Date.now().toString(36);}
const useSettingsStore = create<SettingsStore>()(persist((set,get)=>({
  cameras:toItems(CAMERAS),lenses:toItems(ALL_LENSES),shotTypes:toItems(SHOT_TYPES),cameraMovements:toItems(CAMERA_MOVEMENTS),cameraAngles:toItems(CAMERA_ANGLES),lightingOptions:toItems(LIGHTING_OPTIONS),locations:toItems(LOCATIONS),moods:toItems(MOODS),audioTypes:toItems(DEFAULT_AUDIO),
  addItem:(cat,value)=>{if(!value.trim())return;set(s=>({[cat]:[...s[cat],{id:genId(),value:value.trim(),isActive:true,isCustom:true}]}as any));},
  updateItem:(cat,id,value)=>{set(s=>({[cat]:(s[cat] as SettingItem[]).map(i=>i.id===id?{...i,value}:i)}as any));},
  toggleItem:(cat,id)=>{set(s=>({[cat]:(s[cat] as SettingItem[]).map(i=>i.id===id?{...i,isActive:!i.isActive}:i)}as any));},
  deleteItem:(cat,id)=>{set(s=>({[cat]:(s[cat] as SettingItem[]).filter(i=>i.id!==id)}as any));},
  resetCategory:(cat)=>{const d:Record<Category,string[]>={cameras:CAMERAS,lenses:ALL_LENSES,shotTypes:SHOT_TYPES,cameraMovements:CAMERA_MOVEMENTS,cameraAngles:CAMERA_ANGLES,lightingOptions:LIGHTING_OPTIONS,locations:LOCATIONS,moods:MOODS,audioTypes:DEFAULT_AUDIO};set({[cat]:toItems(d[cat])}as any);},
  getActive:(cat)=>(get()[cat] as SettingItem[]).filter(i=>i.isActive).map(i=>i.value),
}),{name:'storyboard-settings-v1'}));

// ── UI ──
const CATEGORIES:{key:Category;label:string;icon:string;desc:string}[]=[
  {key:'cameras',label:'الكاميرات',icon:'📷',desc:'أنواع الكاميرات'},
  {key:'lenses',label:'العدسات',icon:'🔭',desc:'العدسات والمقاسات'},
  {key:'shotTypes',label:'أنواع اللقطات',icon:'🎬',desc:'Wide Shot, Close Up...'},
  {key:'cameraMovements',label:'حركات الكاميرا',icon:'↗',desc:'Static, Gimbal...'},
  {key:'cameraAngles',label:'زوايا التصوير',icon:'📐',desc:'Eye Level, Low Angle...'},
  {key:'lightingOptions',label:'الإضاءة',icon:'💡',desc:'Natural Light, Softbox...'},
  {key:'locations',label:'المواقع',icon:'📍',desc:'Interior, Exterior...'},
  {key:'moods',label:'المزاج',icon:'🎨',desc:'Cinematic, Luxury...'},
  {key:'audioTypes',label:'أنواع الصوت',icon:'🔊',desc:'Voiceover, Dialogue...'},
];

export default function SettingsSection() {
  const store = useSettingsStore();
  const [activeCategory, setActiveCategory] = useState<Category>('cameras');
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editValue, setEditValue] = useState('');
  const cat = CATEGORIES.find(c=>c.key===activeCategory)!;
  const items:SettingItem[] = store[activeCategory] as SettingItem[];
  const activeCount = items.filter(i=>i.isActive).length;

  const handleAdd=()=>{if(!newValue.trim())return;store.addItem(activeCategory,newValue.trim());setNewValue('');};
  const startEdit=(item:SettingItem)=>{setEditingId(item.id);setEditValue(item.value);};
  const saveEdit=(id:string)=>{if(editValue.trim())store.updateItem(activeCategory,id,editValue.trim());setEditingId(null);};

  return (
    <div style={{padding:'clamp(16px, 4vw, 32px)',maxWidth:'1200px'}}>
      <div style={{marginBottom:'28px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'4px'}}>
          <div style={{width:'4px',height:'28px',borderRadius:'2px',background:'linear-gradient(180deg, #A07830, #C9A84C)'}}/>
          <h1 style={{fontSize:'24px',fontWeight:'900',color:'var(--text-primary)'}}>إدارة الإعدادات</h1>
        </div>
        <p style={{color:'var(--text-secondary)',fontSize:'13px',paddingRight:'16px'}}>أضف أو عدّل أو عطّل الخيارات في قوائم إنشاء اللقطات</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'clamp(160px,25vw,220px) 1fr',gap:'24px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
          {CATEGORIES.map(c=>{
            const its=store[c.key] as SettingItem[];
            const act=its.filter(i=>i.isActive).length;
            const sel=activeCategory===c.key;
            return(<button key={c.key} onClick={()=>setActiveCategory(c.key)} style={{padding:'12px 14px',borderRadius:'10px',border:'none',cursor:'pointer',textAlign:'right',background:sel?'rgba(201,168,76,0.15)':'var(--bg-secondary)',borderLeft:sel?'3px solid var(--gold)':'3px solid transparent',display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{fontSize:'18px'}}>{c.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:'13px',fontWeight:sel?'700':'600',color:sel?'var(--gold)':'var(--text-primary)'}}>{c.label}</div>
                <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{act}/{its.length} مفعّل</div>
              </div>
            </button>);
          })}
        </div>
        <div className="card" style={{padding:'24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                <span style={{fontSize:'24px'}}>{cat.icon}</span>
                <h2 style={{fontSize:'18px',fontWeight:'800',color:'var(--text-primary)'}}>{cat.label}</h2>
                <span style={{fontSize:'11px',fontWeight:'700',padding:'2px 10px',borderRadius:'12px',background:'rgba(201,168,76,0.15)',color:'var(--gold)'}}>{activeCount}/{items.length}</span>
              </div>
              <p style={{fontSize:'12px',color:'var(--text-muted)'}}>{cat.desc}</p>
            </div>
            <button onClick={()=>{if(confirm(`إعادة تعيين ${cat.label}؟`))store.resetCategory(activeCategory);}} style={{padding:'6px 14px',borderRadius:'8px',fontSize:'12px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.06)',color:'#ef4444',cursor:'pointer',fontWeight:'600',fontFamily:'inherit'}}>🔄 إعادة تعيين</button>
          </div>
          <div style={{display:'flex',gap:'10px',marginBottom:'20px',padding:'14px',borderRadius:'10px',background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)'}}>
            <input className="input-field" style={{flex:1}} placeholder={`أضف ${cat.label} جديدة...`} value={newValue} onChange={e=>setNewValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAdd()}/>
            <button className="btn btn-gold" onClick={handleAdd} style={{whiteSpace:'nowrap'}}>+ إضافة</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))',gap:'8px'}}>
            {items.map(item=>(
              <div key={item.id} style={{padding:'10px 12px',borderRadius:'8px',border:`1px solid ${item.isActive?'var(--border)':'rgba(107,114,128,0.2)'}`,background:item.isActive?'var(--bg-secondary)':'rgba(107,114,128,0.04)',opacity:item.isActive?1:0.55,display:'flex',alignItems:'center',gap:'8px',transition:'all 0.15s'}}>
                <button onClick={()=>store.toggleItem(activeCategory,item.id)} style={{width:'18px',height:'18px',borderRadius:'50%',border:item.isActive?'2px solid #22c55e':'2px solid #6b7280',background:item.isActive?'#22c55e':'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'10px',fontFamily:'inherit'}}>{item.isActive?'✓':''}</button>
                {editingId===item.id?(
                  <input autoFocus value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(item.id)} onKeyDown={e=>{if(e.key==='Enter')saveEdit(item.id);if(e.key==='Escape')setEditingId(null);}} style={{flex:1,background:'var(--bg-hover)',border:'1px solid var(--gold)',borderRadius:'6px',padding:'4px 8px',color:'var(--text-primary)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
                ):(
                  <span style={{flex:1,fontSize:'13px',fontWeight:'600',color:item.isActive?'var(--text-primary)':'var(--text-muted)'}}>{item.value}</span>
                )}
                {item.isCustom&&<span style={{fontSize:'9px',padding:'1px 6px',borderRadius:'8px',background:'rgba(168,85,247,0.15)',color:'#a855f7',fontWeight:'700',flexShrink:0}}>مخصص</span>}
                <button onClick={()=>startEdit(item)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'12px',padding:'2px',flexShrink:0}}>✏️</button>
                <button onClick={()=>{if(confirm(`حذف "${item.value}"؟`))store.deleteItem(activeCategory,item.id);}} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:'12px',padding:'2px',flexShrink:0}}>✕</button>
              </div>
            ))}
          </div>
          {items.length===0&&<div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)',fontSize:'14px'}}><div style={{fontSize:'36px',marginBottom:'8px'}}>📭</div>لا توجد عناصر</div>}
          <div style={{marginTop:'20px',padding:'12px 16px',borderRadius:'8px',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',fontSize:'12px',color:'var(--text-secondary)',lineHeight:'1.6'}}>
            <strong style={{color:'#3b82f6'}}>💡 تلميح:</strong> العناصر المُعطَّلة لن تظهر في قوائم إنشاء اللقطات لكنها تبقى محفوظة.
          </div>
        </div>
      </div>
    </div>
  );
}
