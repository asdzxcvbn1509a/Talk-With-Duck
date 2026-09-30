import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

// แนวทางของทีม: เขียนฟังก์ชันเป็น arrow function เสมอ (method ใน class ใช้ได้ตามปกติ)
// และจัดการ error ด้วย async/await + try/catch
const restrictedSyntax = [
  {
    selector: 'FunctionDeclaration',
    message: 'ใช้ arrow function แทน function เช่น const doSomething = () => {}',
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
];

const arrowFunctionRules = {
  'no-restricted-syntax': ['error', ...restrictedSyntax],
  // arrow function ไม่ถูก hoist เหมือน function: ห้ามเรียกใช้ก่อนบรรทัดที่ประกาศ
  'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
};

export default [
  { ignores: ['node_modules', 'coverage', 'src/generated'] },
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      ...arrowFunctionRules,
    },
  },
  {
    // controller ทุกตัวครอบด้วย try/catch แล้วส่ง error ต่อด้วย next(err) ไปที่ middleware/error.js
    files: ['src/controllers/**/*.js'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        {
          selector:
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression:not([body.body.0.type='TryStatement'])",
          message: 'controller ต้องครอบด้วย try { ... } catch (err) { next(err) }',
        },
      ],
    },
  },
];
