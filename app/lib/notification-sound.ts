// نغمة تنبيه قصيرة عند وصول إشعار جديد — تُولَّد مباشرة عبر Web Audio API
// بلا حاجة لملف صوتي خارجي (يتفادى مشاكل تحميل/استضافة الأصول)، وتعمل في
// المتصفح فقط بعد أول تفاعل من المستخدم مع الصفحة (قيود المتصفحات الحديثة
// على تشغيل الصوت التلقائي)، فتُتجاهل أي أخطاء بصمت إن مُنع التشغيل.
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;

    [880, 1180].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });

    setTimeout(() => ctx.close(), 600);
  } catch {
    // تجاهل — بعض المتصفحات تمنع تشغيل الصوت قبل أول تفاعل من المستخدم
  }
}
