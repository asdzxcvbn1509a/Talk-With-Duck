import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

// แนวทางของทีม: เขียนฟังก์ชันเป็น arrow function เสมอ ส่วน component ใช้รูปแบบ rafce
// (const Name = () => { ... }; export default Name;) · method ใน class ใช้ได้ตามปกติ
// และจัดการ error ด้วย async/await + try/catch
const arrowFunctionRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'FunctionDeclaration',
      message: 'ใช้ arrow function แทน function เช่น const Name = () => {}',
    },
    {
      selector:
        ":not(MethodDefinition, Property[method=true], Property[kind='get'], Property[kind='set']) > FunctionExpression",
      message: 'ใช้ arrow function แทน function expression',
    },
    {
      selector: 'CallExpression[callee.property.name=/^(then|catch|finally)$/]',
      message: 'ใช้ async/await กับ try/catch แทน .then/.catch/.finally',
    },
    // ไอคอนใช้ lucide-react เท่านั้น ห้ามใส่ emoji ในโค้ด (รูปเป็ดใช้ /duck.svg หรือ DuckAvatar)
    ...['Literal[value=', 'JSXText[value=', 'TemplateElement[value.raw='].map((node) => ({
      selector: `${node}/\\p{Extended_Pictographic}/u]`,
      message: 'ห้ามใช้ emoji ให้ใช้ไอคอนจาก lucide-react แทน (ค้นชื่อได้ที่ lucide.dev)',
    })),
  ],
  // arrow function ไม่ถูก hoist เหมือน function: ห้ามเรียกใช้ก่อนบรรทัดที่ประกาศ
  'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
};

export default [
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  prettier,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // หน้าต่างยืนยันใช้ confirmDialog จาก lib/dialog.jsx (SweetAlert2) แทน alert/confirm/prompt ของเบราว์เซอร์
      'no-alert': 'error',
      ...arrowFunctionRules,
    },
  },
  {
    // หน้าเว็บเรียก server ผ่านฟังก์ชันใน src/api/ เท่านั้น (1 ไฟล์ต่อ path เช่น rooms.js → /api/rooms)
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/api'],
              importNames: ['api'],
              message:
                'เรียก server ผ่านฟังก์ชันใน src/api/ แทน เช่น import { listRooms } from "../api/rooms"',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
