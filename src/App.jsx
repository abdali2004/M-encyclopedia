import React, { useState, useEffect } from 'react';
import {
  Search, Plus, X, Calendar, Landmark, BookOpen, GraduationCap,
  Moon, Trophy, Mic2, Shield, Star, ChevronRight, Trash2, Pencil,
  Users, Layers, Upload, BadgeCheck, ShieldCheck, Lock, Check
} from 'lucide-react';
import { storage } from './lib/storage';

const INK = '#1E2B32';
const INK_LIGHT = '#2C3E48';
const GOLD = '#B8873A';
const GOLD_LIGHT = '#D7A85C';
const CLAY = '#8B4A3B';
const PARCH = '#F3ECD9';

const FONT_DISPLAY = "'Amiri', serif";
const FONT_BODY = "'Tajawal', sans-serif";

const ADMIN_CODE = 'Muthanna2026';
const CATEGORIES = [
  { id: 'politics', label: 'سياسة وإدارة', icon: Landmark, color: '#B8873A' },
  { id: 'literature', label: 'أدب وثقافة', icon: BookOpen, color: '#3D6B7A' },
  { id: 'science', label: 'علم ومعرفة', icon: GraduationCap, color: '#5B7355' },
  { id: 'religion', label: 'دين وفقه', icon: Moon, color: '#6B5578' },
  { id: 'sports', label: 'رياضة', icon: Trophy, color: '#8B4A3B' },
  { id: 'arts', label: 'فن وإعلام', icon: Mic2, color: '#A6673D' },
  { id: 'military', label: 'عسكرية وأمنية', icon: Shield, color: '#445C82' },
  { id: 'other', label: 'أخرى', icon: Star, color: '#7A6A4F' },
];

const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const emptyForm = {
  name: '', category: 'literature', era: '',
  shortBio: '', fullBio: '', achievements: '', photoUrl: '', photoThumb: '',
};

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return parts[0].slice(0, 1) + parts[1].slice(0, 1);
}

function resizeImageVariants(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image failed'));
      img.onload = () => {
        const draw = (maxDim, quality) => {
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', quality);
        };
        // full: used on the profile page. thumb: tiny, used across the whole
        // index so the encyclopedia can hold many personalities without
        // the shared index file growing too large.
        resolve({ full: draw(640, 0.82), thumb: draw(200, 0.7) });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Seal({ Icon, size = 44, tone = GOLD }) {
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{ border: `2px solid ${tone}`, boxShadow: `inset 0 0 0 3px ${INK}` }} />
      <div className="absolute rounded-full" style={{ inset: 4, border: `1px dashed ${tone}88` }} />
      <Icon size={Math.round(size * 0.42)} color={tone} strokeWidth={1.75} />
    </div>
  );
}

function Avatar({ name, photoUrl, size = 64 }) {
  const [broken, setBroken] = useState(false);
  const showImg = photoUrl && !broken;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full flex items-center justify-center"
      style={{ width: size, height: size, background: `linear-gradient(145deg, ${INK}, ${INK_LIGHT})`, border: `2px solid ${GOLD}` }}
    >
      {showImg ? (
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span style={{ fontFamily: FONT_DISPLAY, color: GOLD_LIGHT, fontSize: size * 0.34 }}>{initials(name)}</span>
      )}
    </div>
  );
}

function VerifiedBadge({ size = 20 }) {
  return (
    <span title="موسوعة موثقة" className="inline-flex items-center justify-center rounded-full" style={{ background: GOLD, width: size, height: size }}>
      <Check size={Math.round(size * 0.65)} color={INK} strokeWidth={3} />
    </span>
  );
}

const inputStyle = {
  width: '100%', fontFamily: FONT_BODY, fontSize: 14, padding: '10px 14px',
  borderRadius: 12, border: `1px solid ${INK}22`, background: '#FBF9F2', color: INK,
};

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs font-bold mb-1.5" style={{ color: `${INK}AA` }}>{label}</div>
      {children}
    </label>
  );
}

export default function App() {
  const [view, setView] = useState('home'); // home | detail | form | submitted | admin
  const [detailBackView, setDetailBackView] = useState('home');
  const [index, setIndex] = useState([]);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [formMode, setFormMode] = useState('add');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [adminAuth, setAdminAuth] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get('index');
        setIndex(res ? JSON.parse(res.value) : []);
      } catch (e) {
        setIndex([]);
      } finally {
        setLoadingIndex(false);
      }
    })();
  }, []);

  async function openDetail(id, backTo = 'home') {
    setSelectedId(id);
    setDetailBackView(backTo);
    setView('detail');
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await storage.get(`person:${id}`);
      setDetail(res ? JSON.parse(res.value) : null);
    } catch (e) {
      setDetailError('تعذّر العثور على هذه السيرة، ربما تم حذفها.');
    } finally {
      setDetailLoading(false);
    }
  }

  function openAddForm() {
    setForm(emptyForm);
    setFormMode('add');
    setFormError('');
    setView('form');
  }

  function openEditForm() {
    if (!detail) return;
    setForm({
      name: detail.name || '', category: detail.category || 'literature', era: detail.era || '',
      shortBio: detail.shortBio || '', fullBio: detail.fullBio || '',
      achievements: detail.achievements || '', photoUrl: detail.photoUrl || '',
      photoThumb: detail.photoThumb || detail.photoUrl || '',
    });
    setFormMode('edit');
    setFormError('');
    setView('form');
  }

  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const { full, thumb } = await resizeImageVariants(file);
      setForm((f) => ({ ...f, photoUrl: full, photoThumb: thumb }));
    } catch (err) {
      setFormError('تعذّر تحميل الصورة، جرّب صورة أخرى.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.era.trim() || !form.shortBio.trim() || !form.fullBio.trim() || !form.achievements.trim() || !form.photoUrl) {
      setFormError('جميع الحقول إلزامية بما فيها الصورة — يرجى تعبئتها كاملة قبل الإرسال.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const id = formMode === 'edit' && selectedId ? selectedId : `p${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      const status = formMode === 'edit' ? (detail && detail.status) || 'published' : 'pending';
      const fullRecord = { ...form, id, status, updatedAt: new Date().toISOString() };
      await storage.set(`person:${id}`, JSON.stringify(fullRecord));

      const liteEntry = { id, name: form.name, category: form.category, era: form.era, photoThumb: form.photoThumb, status };

      let newIndex;
      if (formMode === 'edit') {
        newIndex = index.map((p) => (p.id === id ? liteEntry : p));
      } else {
        newIndex = [liteEntry, ...index];
      }
      await storage.set('index', JSON.stringify(newIndex));
      setIndex(newIndex);

      if (formMode === 'edit') {
        openDetail(id, detailBackView);
      } else {
        setView('submitted');
      }
    } catch (e) {
      setFormError('حدث خطأ أثناء الحفظ، حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(redirectTo = 'home') {
    if (!selectedId) return;
    const ok = typeof window !== 'undefined' && window.confirm ? window.confirm('هل تريد حذف هذه الشخصية نهائياً من الموسوعة؟') : true;
    if (!ok) return;
    try {
      await storage.delete(`person:${selectedId}`);
      const newIndex = index.filter((p) => p.id !== selectedId);
      await storage.set('index', JSON.stringify(newIndex));
      setIndex(newIndex);
      setView(redirectTo);
    } catch (e) {
      setDetailError('تعذّر حذف السيرة.');
    }
  }

  async function approveEntry() {
    if (!selectedId || !detail) return;
    try {
      const updated = { ...detail, status: 'published' };
      await storage.set(`person:${selectedId}`, JSON.stringify(updated));
      const newIndex = index.map((p) => (p.id === selectedId ? { ...p, status: 'published' } : p));
      await storage.set('index', JSON.stringify(newIndex));
      setIndex(newIndex);
      setDetail(updated);
    } catch (e) {
      setDetailError('تعذّر نشر السيرة.');
    }
  }

  function tryAdminLogin(e) {
    e.preventDefault();
    if (adminInput === ADMIN_CODE) {
      setAdminAuth(true);
      setShowAdminPrompt(false);
      setAdminInput('');
      setAdminError('');
      setView('admin');
    } else {
      setAdminError('رمز الدخول غير صحيح.');
    }
  }

  useEffect(() => { setVisibleCount(12); }, [search, activeCategory]);

  const publishedIndex = index.filter((p) => p.status === 'published');
  const pendingIndex = index.filter((p) => p.status === 'pending');

  const filtered = publishedIndex.filter((p) => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  const usedCategories = new Set(publishedIndex.map((p) => p.category)).size;

  return (
    <div dir="rtl" lang="ar" style={{ fontFamily: FONT_BODY, background: PARCH, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;900&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${GOLD}; color: ${INK}; }
        .cat-scroll::-webkit-scrollbar { height: 6px; }
        .cat-scroll::-webkit-scrollbar-thumb { background: ${GOLD}; border-radius: 4px; }
        .wedge-bg { background-image: repeating-linear-gradient(115deg, ${GOLD}0F 0px, ${GOLD}0F 1px, transparent 1px, transparent 26px); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .card-anim { animation: fadeInUp 0.45s ease both; }
        @media (prefers-reduced-motion: reduce) { .card-anim { animation: none; } }
        input:focus, textarea:focus, select:focus { outline: 2px solid ${GOLD}; outline-offset: 1px; }
        button:focus-visible, a:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
      `}</style>

      <header className="sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center gap-3 sm:gap-6 shadow-lg" style={{ background: INK, borderBottom: `3px solid ${GOLD}` }}>
        <button onClick={() => setView('home')} className="flex items-center gap-2 shrink-0">
          <Seal Icon={Layers} size={38} />
          <div className="text-right hidden xs:block">
            <div className="flex items-center gap-1.5">
              <span style={{ fontFamily: FONT_DISPLAY, color: GOLD_LIGHT }} className="text-lg sm:text-xl leading-tight">موسوعة المثنى</span>
              <VerifiedBadge size={16} />
            </div>
            <div className="text-[10px] sm:text-xs text-white/50 leading-tight">سِيَر أعلام المثنى</div>
          </div>
        </button>

        <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-3 py-2 min-w-0">
          <Search size={16} color="#fff" className="opacity-60 shrink-0" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setView('home'); }}
            placeholder="ابحث عن اسم شخصية..."
            className="bg-transparent border-none text-sm text-white placeholder-white/40 w-full min-w-0"
            style={{ outline: 'none' }}
          />
        </div>

        <button onClick={openAddForm} className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-transform hover:scale-105" style={{ background: GOLD, color: INK }}>
          <Plus size={16} />
          <span className="hidden sm:inline">إضافة شخصية</span>
        </button>
      </header>

      {view === 'home' && (
        <>
          <section className="relative overflow-hidden px-4 sm:px-8 py-14 sm:py-20 text-center" style={{ background: INK }}>
            <div className="absolute inset-0">
              <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${INK} 0%, ${INK_LIGHT} 45%, ${INK} 100%)` }} />
              <div className="absolute inset-0 wedge-bg" />
            </div>
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <h1 style={{ fontFamily: FONT_DISPLAY, color: '#fff' }} className="text-3xl sm:text-5xl leading-tight">موسوعة المثنى</h1>
                <VerifiedBadge size={26} />
              </div>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                من هنا انطلق الحرف الأول للكتابة إلى كل بقاع الأرض. أرشيف تعاوني يوثّق سِيَر أعلام محافظة المثنى
                في شتى المجالات، حفظاً لذاكرة أرضٍ حملت أول كلمة مكتوبة في التاريخ.
              </p>

              <div className="flex justify-center gap-6 sm:gap-10 mt-8">
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, color: GOLD_LIGHT }} className="text-2xl sm:text-3xl">{publishedIndex.length}</div>
                  <div className="text-[11px] sm:text-xs text-white/50 mt-1">شخصية موثّقة</div>
                </div>
                <div className="w-px" style={{ background: `${GOLD}55` }} />
                <div>
                  <div style={{ fontFamily: FONT_DISPLAY, color: GOLD_LIGHT }} className="text-2xl sm:text-3xl">{usedCategories}</div>
                  <div className="text-[11px] sm:text-xs text-white/50 mt-1">مجالات مختلفة</div>
                </div>
              </div>
            </div>
          </section>

          <div className="px-4 sm:px-8 pt-6 pb-2 max-w-6xl mx-auto">
            <div className="flex gap-2 overflow-x-auto cat-scroll pb-2">
              <button onClick={() => setActiveCategory('all')} className="shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-colors"
                style={activeCategory === 'all' ? { background: GOLD, color: INK, borderColor: GOLD } : { background: '#fff', color: INK, borderColor: `${INK}22` }}>
                الكل
              </button>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = activeCategory === c.id;
                return (
                  <button key={c.id} onClick={() => setActiveCategory(c.id)} className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-colors"
                    style={active ? { background: GOLD, color: INK, borderColor: GOLD } : { background: '#fff', color: INK, borderColor: `${INK}22` }}>
                    <Icon size={14} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <main className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
            {loadingIndex ? (
              <div className="text-center py-20 text-sm" style={{ color: `${INK}88` }}>جارٍ تحميل الموسوعة...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 sm:py-24 rounded-2xl border-2 border-dashed" style={{ borderColor: `${INK}22` }}>
                <div className="flex justify-center mb-4">
                  <Seal Icon={Users} size={56} />
                </div>
                <h3 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-xl sm:text-2xl mb-2">
                  {publishedIndex.length === 0 ? 'لا توجد شخصيات منشورة بعد' : 'لا توجد نتائج مطابقة'}
                </h3>
                <p className="text-sm mb-6" style={{ color: `${INK}99` }}>
                  {publishedIndex.length === 0
                    ? 'كن أول من يوثّق سيرة إحدى شخصيات محافظة المثنى. تُراجَع كل سيرة قبل نشرها رسمياً في الموسوعة.'
                    : 'جرّب كلمة بحث أخرى أو اختر فئة مختلفة.'}
                </p>
                {publishedIndex.length === 0 && (
                  <button onClick={openAddForm} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: INK, color: GOLD_LIGHT }}>
                    <Plus size={16} />
                    أضف أول شخصية الآن
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.slice(0, visibleCount).map((p, i) => {
                    const cat = catInfo(p.category);
                    return (
                      <button
                        key={p.id}
                        onClick={() => openDetail(p.id, 'home')}
                        className="card-anim text-right rounded-2xl p-5 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden border"
                        style={{ borderColor: `${INK}14`, animationDelay: `${(i % 12) * 40}ms` }}
                      >
                        <div className="absolute -left-3 -top-3 opacity-90">
                          <Seal Icon={cat.icon} size={40} tone={cat.color} />
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar name={p.name} photoUrl={p.photoThumb} size={58} />
                          <div className="min-w-0">
                            <div style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-lg truncate">{p.name}</div>
                            {p.era && <div className="text-xs mt-0.5" style={{ color: `${INK}88` }}>{p.era}</div>}
                          </div>
                        </div>
                        <div className="text-xs font-bold" style={{ color: cat.color }}>{cat.label}</div>
                      </button>
                    );
                  })}
                </div>
                {filtered.length > visibleCount && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisibleCount((v) => v + 12)}
                      className="px-6 py-2.5 rounded-full text-sm font-bold border transition-colors hover:bg-white"
                      style={{ borderColor: `${INK}33`, color: INK, background: '#fff' }}
                    >
                      عرض المزيد ({filtered.length - visibleCount} أخرى)
                    </button>
                  </div>
                )}
              </>
            )}
          </main>

          <footer className="text-center py-8 text-xs flex flex-col items-center gap-3" style={{ background: INK, color: '#ffffff66' }}>
            <div>موسوعة المثنى — أرشيف تعاوني موثّق، كل سيرة تُراجَع قبل نشرها رسمياً.</div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button onClick={() => setShowAdminPrompt(true)} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full" style={{ background: '#ffffff0F', color: '#ffffff88' }}>
                <ShieldCheck size={13} />
                لوحة المراجعة
                {pendingIndex.length > 0 && (
                  <span className="rounded-full text-[10px] px-1.5" style={{ background: GOLD, color: INK }}>{pendingIndex.length}</span>
                )}
              </button>
              <span className="text-[11px]" style={{ color: '#ffffff55' }}>تصميم: عبدالله علي — مصور وصانع محتوى سماوي</span>
            </div>
          </footer>
        </>
      )}

      {view === 'submitted' && (
        <main className="px-4 sm:px-8 py-16 max-w-lg mx-auto min-h-[70vh] text-center">
          <div className="flex justify-center mb-5">
            <Seal Icon={ShieldCheck} size={64} />
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-2xl sm:text-3xl mb-3">تم استلام السيرة</h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: `${INK}99` }}>
            شكراً لمساهمتك في توثيق أعلام المثنى. السيرة الآن قيد المراجعة، وستظهر بشكل رسمي في الموسوعة
            بعد اعتمادها من قِبل المشرف.
          </p>
          <button onClick={() => setView('home')} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold" style={{ background: INK, color: GOLD_LIGHT }}>
            العودة إلى الرئيسية
          </button>
        </main>
      )}

      {view === 'detail' && (
        <main className="px-4 sm:px-8 py-8 max-w-3xl mx-auto min-h-[70vh]">
          <button onClick={() => setView(detailBackView)} className="flex items-center gap-1 text-sm font-bold mb-6" style={{ color: INK }}>
            <ChevronRight size={18} />
            {detailBackView === 'admin' ? 'الرجوع إلى لوحة المراجعة' : 'الرجوع إلى القائمة'}
          </button>

          {detailLoading && <div className="text-center py-20 text-sm" style={{ color: `${INK}88` }}>جارٍ التحميل...</div>}
          {!detailLoading && detailError && <div className="text-center py-20 text-sm" style={{ color: CLAY }}>{detailError}</div>}

          {!detailLoading && detail && (
            <article className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border" style={{ borderColor: `${INK}14` }}>
              {detail.status === 'pending' && (
                <div className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg mb-5" style={{ background: `${GOLD}22`, color: '#8A6420' }}>
                  <ShieldCheck size={14} />
                  قيد المراجعة — لم تُنشر رسمياً في الموسوعة بعد
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-6">
                <Avatar name={detail.name} photoUrl={detail.photoUrl} size={96} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold mb-1" style={{ color: catInfo(detail.category).color }}>{catInfo(detail.category).label}</div>
                  <h1 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-2xl sm:text-3xl mb-2">{detail.name}</h1>
                  {detail.era && (
                    <div className="flex items-center gap-1 text-xs sm:text-sm" style={{ color: `${INK}99` }}>
                      <Calendar size={13} />{detail.era}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 self-start">
                  <button onClick={openEditForm} className="p-2 rounded-full" style={{ background: `${INK}0D`, color: INK }} aria-label="تعديل"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(detailBackView)} className="p-2 rounded-full" style={{ background: `${CLAY}14`, color: CLAY }} aria-label="حذف"><Trash2 size={16} /></button>
                </div>
              </div>

              {adminAuth && detail.status === 'pending' && (
                <button onClick={approveEntry} className="w-full mb-6 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold" style={{ background: INK, color: GOLD_LIGHT }}>
                  <BadgeCheck size={17} />
                  اعتماد ونشر رسمي في الموسوعة
                </button>
              )}

              <div className="h-px w-full mb-6" style={{ background: `${GOLD}55` }} />
              <p className="text-base leading-loose mb-6" style={{ color: INK }}>{detail.shortBio}</p>
              <h2 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-xl mb-3">السيرة الكاملة</h2>e leading-loose text-sm sm:text-base mb-6" style={{ color: `${INK}DD` }}>{detail.fullBio}</p>

              {detail.achievements && (
                <>
                  <h2 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-xl mb-3">أبرز المحطات والإنجازات</h2>
                  <ul className="space-y-2">
                    {detail.achievements.split('\n').filter(Boolean).map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm sm:text-base" style={{ color: `${INK}DD` }}>
                        <span style={{ color: GOLD }} className="mt-1.5 text-xs">◆</span>{line}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </article>
          )}
        </main>
      )}

      {view === 'form' && (
        <main className="px-4 sm:px-8 py-8 max-w-2xl mx-auto min-h-[70vh]">
          <button onClick={() => setView(formMode === 'edit' ? 'detail' : 'home')} className="flex items-center gap-1 text-sm font-bold mb-6" style={{ color: INK }}>
            <ChevronRight size={18} />رجوع
          </button>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border" style={{ borderColor: `${INK}14` }}>
            <div className="flex items-center gap-3 mb-2">
              <Seal Icon={formMode === 'edit' ? Pencil : Plus} size={44} />
              <h1 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-2xl">{formMode === 'edit' ? 'تعديل السيرة' : 'إضافة شخصية جديدة'}</h1>
            </div>
            {formMode === 'add' && (
              <p className="text-xs mb-6" style={{ color: `${INK}88` }}>جميع الحقول أدناه إلزامية، وستخضع السيرة لمراجعة المشرف قبل ظهورها رسمياً في الموسوعة.</p>
            )}
            {formMode === 'edit' && <div className="mb-4" />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="صورة الشخصية *">
                <div className="flex items-center gap-4">
                  <Avatar name={form.name || ' '} photoUrl={form.photoUrl} size={72} />
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold" style={{ background: `${INK}0D`, color: INK }}>
                      <Upload size={14} />
                      {form.photoUrl ? 'تغيير الصورة' : 'رفع صورة'}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                    {form.photoUrl && (
                      <button type="button" onClick={() => setForm({ ...form, photoUrl: '' })} className="text-xs font-bold text-right" style={{ color: CLAY }}>إزالة الصورة</button>
                    )}
                  </div>
                </div>
              </Field>

              <Field label="الاسم الكامل *">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="مثال: عبد الكريم الفلاحي" />
              </Field>

              <Field label="المجال *">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                  {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>

              <Field label="الفترة الزمنية *">
                <input value={form.era} onChange={(e) => setForm({ ...form, era: e.target.value })} style={inputStyle} placeholder="مثال: 1945 - 2010 أو معاصر" />
              </Field>

              <Field label="نبذة مختصرة * (تظهر في البطاقة)">
                <textarea value={form.shortBio} onChange={(e) => setForm({ ...form, shortBio: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} placeholder="جملة أو جملتان تلخّصان مكانة الشخصية..." />
              </Field>

              <Field label="السيرة الكاملة *">
                <textarea value={form.fullBio} onChange={(e) => setForm({ ...form, fullBio: e.target.value })} style={{ ...inputStyle, minHeight: 160 }} placeholder="السيرة الذاتية التفصيلية..." />
              </Field>

              <Field label="أبرز المحطات والإنجازات * (سطر لكل محطة)">
                <textarea value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} style={{ ...inputStyle, minHeight: 90 }} placeholder={'مثال:\nتخرّج من كلية الآداب عام ١٩٧٠\nأصدر ديوانه الأول عام ١٩٧٥'} />
              </Field>

              {formError && <div className="text-sm px-4 py-2 rounded-lg" style={{ background: `${CLAY}14`, color: CLAY }}>{formError}</div>}

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-full font-bold text-sm disabled:opacity-60" style={{ background: INK, color: GOLD_LIGHT }}>
                  {saving ? 'جارٍ الحفظ...' : formMode === 'edit' ? 'حفظ التعديلات' : 'إرسال للمراجعة'}
                </button>
                <button type="button" onClick={() => setView(formMode === 'edit' ? 'detail' : 'home')} className="px-5 py-3 rounded-full font-bold text-sm border" style={{ borderColor: `${INK}22`, color: INK }}>إلغاء</button>
              </div>
            </form>
          </div>
        </main>
      )}

      {view === 'admin' && (
        <main className="px-4 sm:px-8 py-8 max-w-3xl mx-auto min-h-[70vh]">
          <button onClick={() => setView('home')} className="flex items-center gap-1 text-sm font-bold mb-6" style={{ color: INK }}>
            <ChevronRight size={18} />الرجوع إلى الموسوعة
          </button>
          <div className="flex items-center gap-3 mb-6">
            <Seal Icon={ShieldCheck} size={44} />
            <h1 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-2xl">لوحة المراجعة</h1>
          </div>

          {pendingIndex.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border-2 border-dashed" style={{ borderColor: `${INK}22`, color: `${INK}88` }}>
              لا توجد سِيَر بانتظار المراجعة حالياً.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingIndex.map((p) => {
                const cat = catInfo(p.category);
                return (
                  <button key={p.id} onClick={() => openDetail(p.id, 'admin')} className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 border text-right hover:shadow-md transition-shadow" style={{ borderColor: `${INK}14` }}>
                    <Avatar name={p.name} photoUrl={p.photoThumb} size={50} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-base truncate">{p.name}</div>
                      <div className="text-xs" style={{ color: cat.color }}>{cat.label}</div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${GOLD}22`, color: '#8A6420' }}>مراجعة</span>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      )}

      {showAdminPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: '#00000066' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative" style={{ border: `1px solid ${INK}22` }}>
            <button onClick={() => { setShowAdminPrompt(false); setAdminError(''); setAdminInput(''); }} className="absolute left-4 top-4" style={{ color: `${INK}88` }}>
              <X size={18} />
            </button>
            <div className="flex justify-center mb-4"><Seal Icon={Lock} size={48} /></div>
            <h2 style={{ fontFamily: FONT_DISPLAY, color: INK }} className="text-xl text-center mb-4">دخول المشرف</h2>
            <form onSubmit={tryAdminLogin} className="space-y-3">
              <input type="password" value={adminInput} onChange={(e) => setAdminInput(e.target.value)} style={inputStyle} placeholder="رمز الدخول" autoFocus />
              {adminError && <div className="text-xs" style={{ color: CLAY }}>{adminError}</div>}
              <button type="submit" className="w-full py-2.5 rounded-full font-bold text-sm" style={{ background: INK, color: GOLD_LIGHT }}>دخول</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

              <p className="whitespace-pre-lin


  
