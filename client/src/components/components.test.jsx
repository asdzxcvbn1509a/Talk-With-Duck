import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import CrisisSupport from './CrisisSupport';
import DuckAvatar from './DuckAvatar';
import { YearFilter } from './Filters';
import LoveButton from './qa/LoveButton';
import QuestionCard from './qa/QuestionCard';
import { ReportButton } from './ReportModal';
import RoomCard from './RoomCard';
import { ErrorAlert, Modal, NewTabLink, PageTitle, Segmented } from './ui';

vi.mock('../api/questions', () => ({ loveQuestion: vi.fn() }));

/** promise ที่สั่งให้สำเร็จ/ล้มเหลวเองทีหลังได้ (จำลอง server ที่ยังไม่ตอบ) */
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const question = {
  id: 'q1',
  title: 'ปรับตัวกับการเรียนปี 1 ยังไงดี',
  content: 'รู้สึกตามเพื่อนไม่ทัน',
  tagYear: 1,
  topic: 'study',
  loveCount: 3,
  answerCount: 0,
  lovedByMe: false,
  isAnonymous: true,
  isMine: false,
  author: { id: null, nickname: 'เป็ดนิรนาม', avatar: 'duck-anon', year: null },
  createdAt: new Date().toISOString(),
};

describe('PageTitle', () => {
  it('ตั้งชื่อแท็บตามหน้า และคืนชื่อเดิมเมื่อออกจากหน้า', () => {
    const before = document.title;
    const { unmount } = render(<PageTitle title="บอร์ดคำถาม" />);
    expect(document.title).toBe('บอร์ดคำถาม · มัลติเล่า มัลติฟัง');
    unmount();
    expect(document.title).toBe(before);
  });
});

describe('CrisisSupport', () => {
  it('มีลิงก์โทรสายด่วนและช่องทางให้คำปรึกษาของ มจธ. และลิงก์ตรงมาที่กล่องนี้ได้', () => {
    render(<CrisisSupport id="help" />);
    expect(screen.getByRole('complementary')).toHaveAttribute('id', 'help');
    expect(screen.getByRole('link', { name: '1323' })).toHaveAttribute('href', 'tel:1323');
    expect(screen.getByRole('link', { name: '1669' })).toHaveAttribute('href', 'tel:1669');
    expect(screen.getByRole('link', { name: /0-2470-8105/ })).toHaveAttribute(
      'href',
      'tel:024708105',
    );
    expect(screen.getByRole('link', { name: 'cps@kmutt.ac.th' })).toHaveAttribute(
      'href',
      'mailto:cps@kmutt.ac.th',
    );
    // Facebook เป็นเว็บภายนอก: เปิดแท็บใหม่ ส่วนโทร/อีเมลเปิดในหน้าเดิม
    expect(screen.getByRole('link', { name: /counsellingkmutt/ })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.getByRole('link', { name: '1323' })).not.toHaveAttribute('target');
  });
});

describe('NewTabLink และ ErrorAlert', () => {
  it('ลิงก์ออกนอกเว็บเปิดแท็บใหม่ และบอกโปรแกรมอ่านหน้าจอว่าจะเปิดในแท็บใหม่', () => {
    render(
      <NewTabLink href="https://forms.gle/duck" className="link">
        ตอบแบบประเมิน
      </NewTabLink>,
    );
    // jsdom ต่อข้อความใน <span> โดยไม่เว้นวรรค (เบราว์เซอร์จริงอ่านว่า "ตอบแบบประเมิน (เปิดในแท็บใหม่)")
    const link = screen.getByRole('link', { name: /^ตอบแบบประเมิน\s*\(เปิดในแท็บใหม่\)$/ });
    expect(link).toHaveAttribute('href', 'https://forms.gle/duck');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('link');
  });

  it('กล่อง error มี role="alert" ให้โปรแกรมอ่านหน้าจออ่านทันทีที่ขึ้น', () => {
    render(<ErrorAlert className="mt-4">เข้าสู่ระบบไม่สำเร็จ</ErrorAlert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('เข้าสู่ระบบไม่สำเร็จ');
    expect(alert).toHaveClass('mt-4');
  });
});

describe('DuckAvatar', () => {
  it('อวาตาร์ไม่ระบุตัวตนมีป้ายกำกับสำหรับโปรแกรมอ่านหน้าจอ', () => {
    render(<DuckAvatar avatar="duck-anon" />);
    expect(screen.getByRole('img', { name: 'เป็ดนิรนาม' })).toBeInTheDocument();
  });
});

describe('YearFilter', () => {
  it('กดเลือกชั้นปีแล้วแจ้งค่าที่เลือก', () => {
    const onChange = vi.fn();
    render(<YearFilter value={null} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'ทุกชั้นปี' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'ปี 3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});

describe('QuestionCard', () => {
  it('แสดงแท็ก ชื่อเป็ดนิรนาม และสถานะรอคำตอบ', () => {
    render(
      <MemoryRouter>
        <QuestionCard question={question} />
      </MemoryRouter>,
    );
    expect(screen.getByText('เป็ดนิรนาม')).toBeInTheDocument();
    expect(screen.getByText('รอคำตอบ')).toBeInTheDocument();
    // แท็กหัวข้อใช้ไอคอน Lucide (BookOpen) คู่กับชื่อหัวข้อ
    const topicBadge = screen.getByText('การเรียน');
    expect(topicBadge.querySelector('svg.lucide-book-open')).not.toBeNull();
    expect(screen.getByRole('link', { name: question.title })).toHaveAttribute('href', '/qa/q1');
  });
});

describe('RoomCard', () => {
  const room = {
    id: 'r1',
    name: 'ห้องปี 3 หาที่ฝึกงาน',
    type: 'group',
    yearFilter: 3,
    capacity: 10,
    memberCount: 10,
    members: [],
    createdAt: new Date().toISOString(),
  };

  it('ห้องเต็มแสดงป้ายเต็มแล้ว และห้องคาราโอเกะลิงก์ไปหน้าคาราโอเกะ', () => {
    const { rerender } = render(
      <MemoryRouter>
        <RoomCard room={room} />
      </MemoryRouter>,
    );
    expect(screen.getByText('เต็มแล้ว')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/room/r1');

    rerender(
      <MemoryRouter>
        <RoomCard room={{ ...room, type: 'karaoke', memberCount: 2 }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('href', '/karaoke/r1');
  });

  it('ห้องคาราโอเกะบอกเพลงที่กำลังเล่น หรือคิวว่าง (บทที่ 2: Low Cognitive Load)', () => {
    const karaoke = { ...room, type: 'karaoke', memberCount: 2, nowPlaying: null };
    const { rerender } = render(
      <MemoryRouter>
        <RoomCard room={karaoke} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/คิวว่าง/)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <RoomCard room={{ ...karaoke, nowPlaying: 'ดอกไม้ให้คุณ' }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('กำลังเล่น: ดอกไม้ให้คุณ')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAccessibleName(/กำลังเล่น: ดอกไม้ให้คุณ/);
  });

  it('สมาชิกเกิน 5 คน แสดงอวาตาร์ 5 คนกับวงกลม +N', () => {
    const members = Array.from({ length: 7 }, (_, i) => ({
      userId: `u${i}`,
      nickname: `เป็ด ${i}`,
      avatar: 'duck-classic',
    }));
    render(
      <MemoryRouter>
        <RoomCard room={{ ...room, memberCount: 7, members }} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('img')).toHaveLength(5);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});

describe('LoveButton', () => {
  // เก็บข้อมูลคำถามไว้ใน state เหมือนหน้าบอร์ด ปุ่มจะได้เห็นค่าที่อัปเดตแล้ว
  const Harness = () => {
    const [q, setQ] = useState({ ...question, loveCount: 3, lovedByMe: false });
    return <LoveButton question={q} onChange={(_id, patch) => setQ((x) => ({ ...x, ...patch }))} />;
  };

  it('กดแล้วจำนวนใจเพิ่มทันทีโดยไม่รอ server (optimistic) แล้วใช้ค่าจาก server', async () => {
    const { loveQuestion } = await import('../api/questions');
    const reply = deferred();
    loveQuestion.mockReturnValueOnce(reply.promise);
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'ส่งใจให้คำถามนี้' }));
    const button = screen.getByRole('button', { name: 'เลิกส่งใจ' });
    expect(button).toHaveTextContent('4');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await act(async () => reply.resolve({ data: { loved: true, loveCount: 5 } }));
    expect(button).toHaveTextContent('5');
  });

  it('server ตอบไม่สำเร็จ → คืนค่าเดิม', async () => {
    const { loveQuestion } = await import('../api/questions');
    const reply = deferred();
    loveQuestion.mockReturnValueOnce(reply.promise);
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'ส่งใจให้คำถามนี้' }));
    expect(screen.getByRole('button', { name: 'เลิกส่งใจ' })).toHaveTextContent('4');

    await act(async () => reply.reject(new Error('offline')));
    const button = screen.getByRole('button', { name: 'ส่งใจให้คำถามนี้' });
    expect(button).toHaveTextContent('3');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Segmented', () => {
  it('ปุ่มที่เลือกอยู่มี aria-pressed และกดแล้วแจ้งค่าใหม่', () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="เรียงลำดับ"
        options={[
          { value: 'latest', label: 'ล่าสุด' },
          { value: 'popular', label: 'ได้ใจมากสุด' },
        ]}
        value="latest"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('group', { name: 'เรียงลำดับ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ล่าสุด' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'ได้ใจมากสุด' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'ได้ใจมากสุด' }));
    expect(onChange).toHaveBeenCalledWith('popular');
  });
});

describe('Modal', () => {
  it('ผู้เรียกส่ง onClose ตัวใหม่ทุก render → โฟกัสไม่เด้งไปปุ่มปิด และ Escape เรียกตัวล่าสุด', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const modal = (onClose) => (
      <Modal open onClose={onClose} title="ทดสอบ">
        <input aria-label="ช่องพิมพ์" />
      </Modal>
    );
    const { rerender } = render(modal(first));
    const input = screen.getByRole('textbox', { name: 'ช่องพิมพ์' });
    input.focus();

    rerender(modal(latest));
    expect(input).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(latest).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('กด Tab แล้วโฟกัสวนอยู่ในหน้าต่าง ไม่หลุดไปหน้าด้านหลัง', () => {
    render(
      <>
        <button type="button">ปุ่มหน้าหลัง</button>
        <Modal open onClose={() => {}} title="ทดสอบ">
          <input aria-label="ช่องพิมพ์" />
          <button type="button">ตกลง</button>
        </Modal>
      </>,
    );
    // ปุ่ม "ปิด" มี 2 ปุ่ม: พื้นหลังมืด (กดเพื่อปิด) กับปุ่ม X บนหัวหน้าต่าง
    const [backdrop, close] = screen.getAllByRole('button', { name: 'ปิด' });
    const ok = screen.getByRole('button', { name: 'ตกลง' });

    ok.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(ok).toHaveFocus();

    // พื้นหลังกด Tab ไปไม่ถึง (กดเมาส์/แตะเพื่อปิดได้ตามเดิม)
    expect(backdrop).toHaveAttribute('tabindex', '-1');
  });

  it('เปิดอยู่ล็อกการเลื่อนหน้าด้านหลัง ปิดแล้วคืนค่าเดิม', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="ทดสอบ">
        เนื้อหา
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Modal open={false} onClose={() => {}} title="ทดสอบ">
        เนื้อหา
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});

describe('ReportModal', () => {
  it('พิมพ์รายละเอียดได้ต่อเนื่อง โฟกัสไม่เด้งไปปุ่มปิดระหว่างพิมพ์', () => {
    render(<ReportButton target={{ type: 'message', id: 'm1', label: 'ข้อความนี้' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'รายงาน' }));
    const details = screen.getByLabelText('รายละเอียดเพิ่มเติม (ไม่บังคับ)');
    details.focus();

    fireEvent.change(details, { target: { value: 'พูดจา' } });
    fireEvent.change(details, { target: { value: 'พูดจาไม่ดี ซ้ำหลายครั้ง' } });
    expect(details).toHaveFocus();
    expect(details).toHaveValue('พูดจาไม่ดี ซ้ำหลายครั้ง');
  });
});
