// อวาตาร์น้องเป็ด (placeholder ให้ทีมออกแบบเปลี่ยนเป็นภาพจริงได้ภายหลัง)
// speaking = วงคลื่นเรืองแสงรอบอวาตาร์ขณะกำลังพูด (Speaking Indicator)
import { ANONYMOUS_AVATAR, AVATARS } from '../config/constants';

const INK = '#3B2F1E';

const Accessory = ({ type }) => {
  switch (type) {
    case 'headphones':
      return (
        <g>
          <path
            d="M18 50a32 32 0 0 1 64 0"
            fill="none"
            stroke="#3FA69C"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect x="10" y="44" width="13" height="22" rx="6" fill="#5BBFB5" />
          <rect x="77" y="44" width="13" height="22" rx="6" fill="#5BBFB5" />
        </g>
      );
    case 'glasses':
      return (
        <g fill="none" stroke={INK} strokeWidth="3">
          <circle cx="37" cy="46" r="10" />
          <circle cx="63" cy="46" r="10" />
          <path d="M47 46h6" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M22 34a28 22 0 0 1 56 0z" fill="#3FA69C" />
          <path d="M62 33h26a3 3 0 0 1 0 6H62z" fill="#2E8880" />
          <circle cx="50" cy="14" r="3" fill="#2E8880" />
        </g>
      );
    case 'bow':
      return (
        <g transform="translate(66 18) rotate(15)">
          <path d="M0 0l-14-9v18zM0 0l14-9v18z" fill="#FF8FAB" />
          <circle r="4" fill="#F06292" />
        </g>
      );
    case 'scarf':
      return (
        <g>
          <path d="M20 76c18 10 42 10 60 0l2 8c-20 11-44 11-64 0z" fill="#FF9F43" />
          <path d="M66 82l6 14h-9l-3-12z" fill="#E06F14" />
        </g>
      );
    case 'flower':
      return (
        <g transform="translate(28 22)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              rx="5"
              ry="8"
              transform={`rotate(${deg}) translate(0 -7)`}
              fill="#FFB3C7"
            />
          ))}
          <circle r="5" fill="#FFD35C" stroke="#F5B316" />
        </g>
      );
    case 'star':
      return (
        <path
          d="M50 4l4.4 9 9.9 1.4-7.2 7 1.7 9.8L50 26.6l-8.8 4.6 1.7-9.8-7.2-7 9.9-1.4z"
          fill="#FFF0BF"
          stroke="#F5B316"
          strokeWidth="2"
        />
      );
    default:
      return <path d="M50 17c-3-6-10-8-14-5 4 1 6 4 7 7" fill="#F5B316" />;
  }
};

// fluid: กว้างเต็มช่องที่วางแต่ไม่เกิน size (ใช้ในตารางที่ช่องแคบกว่ารูปบนจอมือถือ)
const DuckAvatar = ({
  avatar,
  size = 56,
  fluid = false,
  speaking = false,
  level = 0,
  dimmed = false,
  className = '',
  label,
}) => {
  const isAnon = avatar === ANONYMOUS_AVATAR;
  const config = AVATARS.find((a) => a.key === avatar) ?? AVATARS[0];
  const body = isAnon ? '#D6CEC2' : config.body;
  const glow = speaking ? Math.min(14, 4 + level * 60) : 0;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full transition-[box-shadow,opacity] duration-150 ${dimmed ? 'opacity-50' : ''} ${className}`}
      style={{
        ...(fluid
          ? { width: '100%', maxWidth: size, aspectRatio: '1' }
          : { width: size, height: size }),
        boxShadow: speaking
          ? `0 0 0 ${glow}px rgb(91 191 181 / 0.35), 0 0 0 3px #5BBFB5`
          : undefined,
      }}
      role="img"
      aria-label={label ?? (isAnon ? 'เป็ดนิรนาม' : config.label)}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="52" r="36" fill={body} />
        {!isAnon && <Accessory type={config.accessory} />}
        <ellipse cx="30" cy="61" rx="7" ry="4.5" fill="#FF9F9F" opacity=".45" />
        <ellipse cx="70" cy="61" rx="7" ry="4.5" fill="#FF9F9F" opacity=".45" />
        {isAnon ? (
          <>
            <rect x="22" y="38" width="56" height="15" rx="7.5" fill={INK} />
            <circle cx="37" cy="45.5" r="3.5" fill="#fff" />
            <circle cx="63" cy="45.5" r="3.5" fill="#fff" />
          </>
        ) : (
          <>
            <circle cx="37" cy="46" r="5" fill={INK} />
            <circle cx="63" cy="46" r="5" fill={INK} />
            <circle cx="38.6" cy="44.4" r="1.6" fill="#fff" />
            <circle cx="64.6" cy="44.4" r="1.6" fill="#fff" />
          </>
        )}
        <ellipse cx="50" cy="62" rx="15" ry="7.5" fill={isAnon ? '#C9A27A' : '#FF9F43'} />
        <path
          d="M36 62h28"
          stroke={isAnon ? '#A5805A' : '#E06F14'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

export default DuckAvatar;
