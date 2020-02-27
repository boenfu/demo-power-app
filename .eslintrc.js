module.exports = {
  parser: 'babel-eslint',
  extends: ['prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': ['error'],
  },
  parserOptions: {
    ecmaVersion: 11,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
  env: {
    es6: true,
  },
};
