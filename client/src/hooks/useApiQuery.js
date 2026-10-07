// ดึงข้อมูลด้วยฟังก์ชันจาก src/api เช่น useApiQuery(readQuestion, id) หรือ useApiQuery(listRooms, { year })
// ถ้าฟังก์ชันหรือ arg เปลี่ยนจะถือว่ากำลังโหลดใหม่อัตโนมัติ · ส่ง fetcher เป็น null ถ้ายังไม่ต้องโหลด
// fetcher ต้องเป็นฟังก์ชันที่ประกาศไว้นอก component (เช่น import จาก src/api) ถ้าเขียน () => ... ตรงนี้
// จะได้ฟังก์ชันใหม่ทุกครั้งที่ render และโหลดซ้ำไม่หยุด
import { useCallback, useEffect, useState } from 'react';

export const useApiQuery = (fetcher, arg) => {
  const argKey = JSON.stringify(arg ?? null);
  const [state, setState] = useState({ fetcher: null, argKey: null, data: undefined, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!fetcher) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await fetcher(JSON.parse(argKey) ?? undefined);
        if (!cancelled) setState({ fetcher, argKey, data, error: null });
      } catch (err) {
        if (!cancelled) setState({ fetcher, argKey, data: undefined, error: err });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetcher, argKey, reloadToken]);

  const current = Boolean(fetcher) && state.fetcher === fetcher && state.argKey === argKey;
  const setData = useCallback(
    (updater) =>
      setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  );
  // reload: โหลดใหม่เงียบ ๆ ข้อมูลเดิมยังแสดงอยู่ระหว่างรอ (เช่น หน้าผู้ดูแลหลังตรวจรายงาน)
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);
  // retry: ลองใหม่หลังโหลดไม่สำเร็จ กลับไปสถานะกำลังโหลด (loading = true) ผู้ใช้จะเห็นว่ากดติดแล้ว
  // ไม่ค้างหน้าข้อผิดพลาดเดิมระหว่างรอ
  const retry = useCallback(() => {
    setState((s) => ({ ...s, argKey: null }));
    setReloadToken((t) => t + 1);
  }, []);

  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: Boolean(fetcher) && !current,
    setData,
    reload,
    retry,
  };
};
