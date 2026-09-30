// โหลดสคริปต์ปุ่ม "Sign in with Google" (Google Identity Services) ครั้งเดียวต่อหน้าเว็บ
let loading = null;

export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve(window.google.accounts.id);
      script.onerror = () => {
        loading = null;
        reject(new Error('โหลดปุ่ม Google ไม่สำเร็จ'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
};
