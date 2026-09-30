// บัญชีทดสอบตอนพัฒนาในเครื่อง: กดแล้วเข้าได้เลยโดยไม่ต้องใช้ Google (ทดสอบหลายบัญชี/บนมือถือผ่าน LAN)
// แสดงเฉพาะ npm run dev และ server ต้องตั้ง DEV_LOGIN=true · บนเว็บจริงไม่มีทั้งส่วนนี้และ route ฝั่ง server
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { listDevAccounts } from '../api/auth';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorMessage } from '../lib/api';
import { devLogin } from '../lib/auth';
import DuckAvatar from './DuckAvatar';
import { Spinner } from './ui';

const DevAccounts = ({ onSignedIn }) => {
  const { data, error, loading } = useApiQuery(listDevAccounts);
  const [pendingId, setPendingId] = useState(null);
  const [loginError, setLoginError] = useState('');

  const signIn = async (userId) => {
    setPendingId(userId);
    setLoginError('');
    try {
      onSignedIn(await devLogin(userId));
    } catch (err) {
      setLoginError(errorMessage(err));
      setPendingId(null);
    }
  };

  return (
    <section className="mt-6 border-t border-dashed border-line pt-5" aria-label="บัญชีทดสอบ">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <FlaskConical size={16} /> บัญชีทดสอบ (เฉพาะตอนพัฒนาในเครื่อง)
      </p>
      {loading && <Spinner size={18} className="mt-3" />}
      {error && (
        <p className="mt-2 text-sm text-muted">
          {error.response?.status === 404
            ? 'ตั้ง DEV_LOGIN=true ใน server/.env แล้วรีสตาร์ท server เพื่อใช้บัญชีทดสอบ'
            : errorMessage(error)}
        </p>
      )}
      {data && (
        <ul className="mt-3 grid grid-cols-1 gap-1">
          {data.accounts.map((account) => (
            <li key={account.id}>
              <button
                type="button"
                onClick={() => signIn(account.id)}
                disabled={pendingId !== null}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-surface-2 disabled:opacity-60"
              >
                <DuckAvatar avatar={account.avatar} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{account.nickname}</span>
                  <span className="block truncate text-xs text-muted">
                    {account.role === 'moderator' ? 'ผู้ดูแล' : `ปี ${account.year}`} ·{' '}
                    {account.email}
                  </span>
                </span>
                {pendingId === account.id && <Spinner size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {loginError && (
        <p className="mt-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {loginError}
        </p>
      )}
    </section>
  );
};

export default DevAccounts;
