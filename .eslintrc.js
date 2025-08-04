module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Warnings que podem quebrar o build em produção
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react/display-name': 'warn',
    '@next/next/no-img-element': 'warn',
    
    // Erros que devem ser corrigidos
    'react-hooks/rules-of-hooks': 'error',
    'no-unused-vars': 'warn',
    
    // Configurações para desenvolvimento vs produção
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
}
