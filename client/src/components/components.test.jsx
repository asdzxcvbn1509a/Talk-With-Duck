import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import DuckAvatar from './DuckAvatar';
import { YearFilter } from './Filters';
import QuestionCard from './qa/QuestionCard';
import RoomCard from './RoomCard';

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
});
