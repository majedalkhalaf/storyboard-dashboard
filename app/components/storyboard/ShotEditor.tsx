'use client';

import { useState, useRef, useEffect } from 'react';
import { Shot, ShotStatus, TimeOfDay, Mood, VoiceNote } from '../../lib/types';
import { useAppStore } from '../../store/useAppStore';
import {
  CAMERAS, ALL_LENSES, SHOT_TYPES, CAMERA_MOVEMENTS, CAMERA_ANGLES,
  LIGHTING_OPTIONS, LOCATIONS, TIMES_OF_DAY, MOODS, SMART_PRESETS
} from '../../lib/constants';

interface ShotEditorProps {
  shot: Shot;
  partId: string;
  storyboardId: string;
  onClose: () => void;
}

// Helper: select with "أخرى" option
function SelectWithOther({
  label, value, options, onChange, placeholder = 'اختر...'
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const isOther = value !== '' && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isOther);
  const [customVal, setCustomVal] = useState(isOther ? value : '');

  useEffect(() => {
    const other = value !== '' && !options.includes(value);
    setShowCustom(other);
    if (other) setCustomVal(value);
  }, [value, options]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === '__other__') {
      setShowCustom(true);
      setCustomVal('');
      onChange('');
    } else {
      setShowCustom(false);
      onChange(v);
    }
  };

  const selectValue = showCustom ? '__other__' : (value || '');

  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>
        {label}
      </label>
      <select className="input-field" value={selectValue} onChange={handleSelect}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">✏️ أخرى (اكتب يدوياً)</option>
      </select>
      {showCustom && (
        <input
          className="input-field"
          style={{ marginTop: '6px' }}
          placeholder={`اكتب ${label} يدوياً...`}
          value={customVal}
          onChange={e => {
            setCustomVal(e.target.value);
            onChange(e.target.value);
          }}
          autoFocus
        />
      )}
    </div>
  );
}

const AUDIO_TYPES = ['Voiceover', 'Dialogue', 'Ambient Sound', 'Music', 'Sound Effects', 'Silent', 'Mixed Audio'];

export default function ShotEditor({ shot, partId, storyboardId, onClose }: ShotEditorProps) {
  const { updateShot, equipment } = useAppStore();
  const [form, setForm] = useState<Shot>({ ...shot, isCompleted: shot.isCompleted ?? false });
  const [activeTab, setActiveTab] = useState<'basic' | 'camera' | 'production' | 'notes' | 'voice'>('basic');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Image upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateShot(storyboardId, partId, shot.id, form);
    onClose();
  };

  const applyPreset = (preset: typeof SMART_PRESETS[0]) => {
    setForm(f => ({
      ...f,
      camera: preset.camera,
      lens: preset.lens,
      cameraMovement: preset.movement,
      lighting: preset.lighting,
      equipment: preset.equipment,
      mood: preset.mood as Mood,
      shotType: preset.shotType,
      cameraAngle: preset.angle,
    }));
  };

  const toggleEquipment = (item: string) => {
    setForm(f => ({
      ...f,
      equipment: f.equipment.includes(item)
        ? f.equipment.filter(e => e !== item)
        : [...f.equipment, item]
    }));
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, referenceImage: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (ev) => {
          const voiceNote: VoiceNote = {
            dataUrl: ev.target?.result as string,
            duration: recordingTime,
            createdAt: new Date().toISOString(),
          };
          setForm(f => ({ ...f, voiceNote }));
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert('لم يتم الوصول إلى الميكروفون. تأكد من منح الصلاحية.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const deleteVoiceNote = () => {
    if (confirm('حذف الملاحظة الصوتية؟')) {
      setForm(f => ({ ...f, voiceNote: undefined }));
    }
  };

  const playVoiceNote = () => {
    if (!form.voiceNote) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
      return;
    }
    const audio = new Audio(form.voiceNote.dataUrl);
    audioRef.current = audio;
    audio.onended = () => { setAudioPlaying(false); audioRef.current = null; };
    audio.play();
    setAudioPlaying(true);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const STATUS_OPTS: { value: ShotStatus; label: string }[] = [
    { value: 'draft', label: 'مسودة' },
    { value: 'ready', label: 'جاهز' },
    { value: 'filmed', label: 'مصوّر' },
    { value: 'completed', label: 'مكتمل' },
  ];

  const TABS = [
    { id: 'basic', label: '📝 أساسي' },
    { id: 'camera', label: '📷 الكاميرا' },
    { id: 'production', label: '🎬 الإنتاج' },
    { id: 'voice', label: '🎙️ صوتي' },
    { id: 'notes', label: '📌 ملاحظات' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 'min(820px, 98vw)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: form.isCompleted ? '#22c55e' : 'var(--gold)',
              color: '#0A0A0B', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: '900'
            }}>
              {form.number}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>تعديل اللقطة</h2>
            {/* Completion toggle */}
            <button
              onClick={() => setForm(f => ({ ...f, isCompleted: !f.isCompleted }))}
              style={{
                padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
                border: form.isCompleted ? '1px solid #22c55e' : '1px solid var(--border)',
                background: form.isCompleted ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)',
                color: form.isCompleted ? '#22c55e' : 'var(--text-muted)',
                fontSize: '12px', fontWeight: '700', transition: 'all 0.2s'
              }}
            >
              {form.isCompleted ? '✅ تم التصوير' : '○ لم يُصوَّر بعد'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select className="input-field" style={{ width: 'auto', fontSize: '12px', padding: '6px 12px' }}
              value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ShotStatus })}>
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
          </div>
        </div>

        {/* Smart Presets */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>⚡ الإعدادات المسبقة الذكية</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {SMART_PRESETS.map(preset => (
              <button key={preset.name} onClick={() => applyPreset(preset)} style={{
                padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.3)',
                background: 'rgba(201,168,76,0.08)', color: 'var(--gold)', cursor: 'pointer',
                fontSize: '11px', fontWeight: '600', transition: 'all 0.15s'
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)'}>
                {preset.nameAr}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: activeTab === tab.id ? '700' : '500',
              color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s', whiteSpace: 'nowrap'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ maxHeight: '440px', overflowY: 'auto', paddingLeft: '4px' }}>

          {/* ── BASIC ── */}
          {activeTab === 'basic' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>رقم اللقطة</label>
                <input className="input-field" type="number" value={form.number} onChange={e => setForm({ ...form, number: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>مدة اللقطة (ثانية)</label>
                <input className="input-field" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>عنوان اللقطة</label>
                <input className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>وصف اللقطة</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>التعليق الصوتي / Voice Over</label>
                <textarea className="input-field" rows={2} value={form.voiceOver || ''} onChange={e => setForm({ ...form, voiceOver: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <SelectWithOther
                label="الموقع"
                value={form.location || ''}
                options={LOCATIONS}
                onChange={v => setForm({ ...form, location: v })}
                placeholder="اختر الموقع"
              />
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>وقت اليوم</label>
                <select className="input-field" value={form.timeOfDay || ''} onChange={e => setForm({ ...form, timeOfDay: e.target.value as TimeOfDay })}>
                  <option value="">اختر الوقت</option>
                  {TIMES_OF_DAY.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                </select>
              </div>
              <SelectWithOther
                label="المزاج / الأسلوب"
                value={form.mood || ''}
                options={MOODS}
                onChange={v => setForm({ ...form, mood: v as Mood })}
                placeholder="اختر المزاج"
              />
              <SelectWithOther
                label="نوع الصوت"
                value={form.audioType || ''}
                options={AUDIO_TYPES}
                onChange={v => setForm({ ...form, audioType: v })}
                placeholder="اختر نوع الصوت"
              />
            </div>
          )}

          {/* ── CAMERA ── */}
          {activeTab === 'camera' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <SelectWithOther
                label="الكاميرا"
                value={form.camera || ''}
                options={CAMERAS}
                onChange={v => setForm({ ...form, camera: v })}
                placeholder="اختر الكاميرا"
              />
              <SelectWithOther
                label="العدسة"
                value={form.lens || ''}
                options={ALL_LENSES}
                onChange={v => setForm({ ...form, lens: v })}
                placeholder="اختر العدسة"
              />
              <SelectWithOther
                label="زاوية الكاميرا"
                value={form.cameraAngle || ''}
                options={CAMERA_ANGLES}
                onChange={v => setForm({ ...form, cameraAngle: v })}
                placeholder="اختر الزاوية"
              />
              <SelectWithOther
                label="حركة الكاميرا"
                value={form.cameraMovement || ''}
                options={CAMERA_MOVEMENTS}
                onChange={v => setForm({ ...form, cameraMovement: v })}
                placeholder="اختر الحركة"
              />
              <SelectWithOther
                label="نوع اللقطة"
                value={form.shotType || ''}
                options={SHOT_TYPES}
                onChange={v => setForm({ ...form, shotType: v })}
                placeholder="اختر النوع"
              />
              <SelectWithOther
                label="الإضاءة"
                value={form.lighting || ''}
                options={LIGHTING_OPTIONS}
                onChange={v => setForm({ ...form, lighting: v })}
                placeholder="اختر الإضاءة"
              />
            </div>
          )}

          {/* ── PRODUCTION / EQUIPMENT ── */}
          {activeTab === 'production' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>
                المعدات المطلوبة
              </label>
              {equipment.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>من مخزون المعدات:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {equipment.map(eq => (
                      <button key={eq.id} onClick={() => toggleEquipment(eq.name)} style={{
                        padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.15s',
                        background: form.equipment.includes(eq.name) ? 'rgba(201,168,76,0.2)' : 'var(--bg-hover)',
                        border: form.equipment.includes(eq.name) ? '1px solid rgba(201,168,76,0.5)' : '1px solid var(--border)',
                        color: form.equipment.includes(eq.name) ? 'var(--gold)' : 'var(--text-secondary)',
                      }}>
                        {form.equipment.includes(eq.name) ? '✓ ' : ''}{eq.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>معدات شائعة:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {['Sony FX3', 'Sony A7SIII', 'DJI Drone', 'Gimbal', 'Slider', 'Monitor', 'Tripod', 'LED Panel', 'Softbox', 'Wireless Mic'].map(item => (
                  <button key={item} onClick={() => toggleEquipment(item)} style={{
                    padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'all 0.15s',
                    background: form.equipment.includes(item) ? 'rgba(201,168,76,0.2)' : 'var(--bg-hover)',
                    border: form.equipment.includes(item) ? '1px solid rgba(201,168,76,0.5)' : '1px solid var(--border)',
                    color: form.equipment.includes(item) ? 'var(--gold)' : 'var(--text-secondary)',
                  }}>
                    {form.equipment.includes(item) ? '✓ ' : ''}{item}
                  </button>
                ))}
              </div>
              {/* Custom equipment input */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>إضافة معدة يدوياً:</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="custom-eq-input"
                    className="input-field"
                    placeholder="اكتب اسم المعدة..."
                    style={{ flex: 1 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) { toggleEquipment(val); (e.target as HTMLInputElement).value = ''; }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const inp = document.getElementById('custom-eq-input') as HTMLInputElement;
                      if (inp?.value.trim()) { toggleEquipment(inp.value.trim()); inp.value = ''; }
                    }}
                    className="btn btn-gold"
                    style={{ padding: '8px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    + إضافة
                  </button>
                </div>
              </div>
              {form.equipment.length > 0 && (
                <div style={{ padding: '12px', background: 'rgba(201,168,76,0.08)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: '700', marginBottom: '6px' }}>
                    ✓ المعدات المحددة ({form.equipment.length})
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {form.equipment.map(eq => (
                      <span
                        key={eq}
                        className="chip chip-gold"
                        style={{ fontSize: '11px', cursor: 'pointer' }}
                        onClick={() => toggleEquipment(eq)}
                        title="اضغط للإزالة"
                      >
                        {eq} ✕
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VOICE NOTE ── */}
          {activeTab === 'voice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                padding: '20px', borderRadius: '12px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎙️</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  ملاحظة صوتية للقطة
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  سجّل توجيهاتك أو ملاحظاتك للرجوع إليها أثناء التصوير
                </div>

                {/* Recording controls */}
                {!form.voiceNote ? (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        style={{
                          padding: '14px 32px', borderRadius: '30px',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: '#fff', border: 'none', cursor: 'pointer',
                          fontSize: '14px', fontWeight: '700',
                          boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
                          transition: 'all 0.2s'
                        }}
                      >
                        🔴 ابدأ التسجيل
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          fontSize: '28px', fontWeight: '900', color: '#ef4444',
                          fontVariantNumeric: 'tabular-nums',
                          animation: 'pulse 1s infinite'
                        }}>
                          ⏱ {formatTime(recordingTime)}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[...Array(5)].map((_, i) => (
                            <div key={i} style={{
                              width: '4px',
                              height: `${8 + Math.random() * 20}px`,
                              background: '#ef4444',
                              borderRadius: '2px',
                              animation: 'pulse 0.5s infinite alternate'
                            }} />
                          ))}
                        </div>
                        <button
                          onClick={stopRecording}
                          style={{
                            padding: '12px 28px', borderRadius: '30px',
                            background: '#1f2937', color: '#fff',
                            border: '2px solid #ef4444', cursor: 'pointer',
                            fontSize: '13px', fontWeight: '700'
                          }}
                        >
                          ⏹ إيقاف التسجيل
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                    {/* Playback */}
                    <div style={{
                      padding: '16px 24px', borderRadius: '12px',
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      width: '100%', maxWidth: '360px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '700' }}>✅ تم التسجيل</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {formatTime(form.voiceNote.duration)}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        📅 {new Date(form.voiceNote.createdAt).toLocaleDateString('ar-SA')}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={playVoiceNote}
                          style={{
                            padding: '8px 20px', borderRadius: '20px',
                            background: audioPlaying ? '#ef4444' : '#22c55e',
                            color: '#fff', border: 'none', cursor: 'pointer',
                            fontSize: '12px', fontWeight: '700'
                          }}
                        >
                          {audioPlaying ? '⏸ إيقاف' : '▶️ تشغيل'}
                        </button>
                        <button
                          onClick={deleteVoiceNote}
                          style={{
                            padding: '8px 16px', borderRadius: '20px',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                            cursor: 'pointer', fontSize: '12px', fontWeight: '700'
                          }}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => { setForm(f => ({ ...f, voiceNote: undefined })); startRecording(); }}
                      style={{
                        padding: '8px 20px', borderRadius: '20px',
                        background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                        border: '1px solid var(--border)', cursor: 'pointer',
                        fontSize: '12px', fontWeight: '600'
                      }}
                    >
                      🔄 إعادة التسجيل
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── NOTES + IMAGE ── */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>ملاحظات المخرج</label>
                <textarea className="input-field" rows={4} value={form.directorNotes || ''} onChange={e => setForm({ ...form, directorNotes: e.target.value })} style={{ resize: 'vertical' }} placeholder="توجيهات المخرج للطاقم..." />
              </div>

              {/* Reference image */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                  🖼️ الصورة المرجعية
                </label>
                {form.referenceImage ? (
                  <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={form.referenceImage} alt="Reference" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                    <div style={{
                      position: 'absolute', top: '8px', left: '8px',
                      display: 'flex', gap: '6px'
                    }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          background: 'var(--gold)', color: '#000',
                          border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700'
                        }}
                      >
                        🔄 تغيير
                      </button>
                      <button
                        onClick={() => { if (confirm('حذف الصورة؟')) setForm(f => ({ ...f, referenceImage: undefined })); }}
                        style={{
                          padding: '6px 12px', borderRadius: '6px',
                          background: 'rgba(239,68,68,0.9)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700'
                        }}
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%', padding: '32px', borderRadius: '10px',
                      background: 'var(--bg-hover)',
                      border: '2px dashed var(--border)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: '8px', cursor: 'pointer', transition: 'all 0.2s',
                      color: 'var(--text-muted)'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-dark)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--gold)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    }}
                  >
                    <span style={{ fontSize: '32px' }}>🖼️</span>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>رفع صورة مرجعية للقطة</span>
                    <span style={{ fontSize: '11px' }}>JPG, PNG, WEBP • أي حجم</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                />
                {/* URL option */}
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
                    أو أدخل رابط الصورة:
                  </label>
                  <input
                    className="input-field"
                    placeholder="https://..."
                    value={form.referenceImage?.startsWith('data:') ? '' : (form.referenceImage || '')}
                    onChange={e => setForm({ ...form, referenceImage: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: '12px', marginTop: '20px',
          justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid var(--border)', paddingTop: '16px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {form.isCompleted
              ? <span style={{ color: '#22c55e', fontWeight: '700' }}>✅ هذه اللقطة مكتملة</span>
              : <span>○ لم تُصوَّر بعد</span>
            }
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
            <button className="btn btn-gold" onClick={handleSave}>💾 حفظ اللقطة</button>
          </div>
        </div>
      </div>
    </div>
  );
}
