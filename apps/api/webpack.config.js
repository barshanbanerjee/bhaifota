const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: './src/main.ts',
    externals: [
      nodeExternals({
        allowlist: [
          /^@nestjs/,
          /^rxjs/,
          /^reflect-metadata/,
          /^cookie-parser/,
          /^helmet/,
          /^class-validator/,
          /^class-transformer/,
          /^passport/,
          /^google-auth-library/,
          /^resend/,
          /^@bhaifota/,
        ],
      }),
    ],
  };
};
