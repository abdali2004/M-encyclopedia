// طبقة تخزين بديلة عن window.storage (الخاصة بمعاينة Claude فقط)
// هنا نستخدم جدول key-value بسيط في Supabase حتى تبقى بيانات
// الموسوعة (الفهرس وكل سيرة ذاتية) محفوظة بشكل دائم ومشتركة بين كل الزوار.

import { supabase } from './supabaseClient';

const TABLE = 'kv_store';

export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return { key, value: data.value };
  },

  async set(key, value) {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) throw error;
    return { key, value };
  },

  async delete(key) {
    const { error } = await supabase.from(TABLE).delete().eq('key', key);
    if (error) throw error;
    return { key, deleted: true };
  },
};
