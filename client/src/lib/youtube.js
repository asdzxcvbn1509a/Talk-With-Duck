// โหลด YouTube IFrame API ครั้งเดียว (ข้อ 3.5.6 ข้อ 1)
let loading = null;

export const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        loading = null;
        reject(new Error('โหลดตัวเล่น YouTube ไม่สำเร็จ'));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
};

// รหัสสถานะของ YT.Player
export const PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};
// error 100 = ไม่พบวิดีโอ, 101/150 = เจ้าของปิดการฝังวิดีโอ
export const UNPLAYABLE_ERRORS = new Set([100, 101, 150]);
