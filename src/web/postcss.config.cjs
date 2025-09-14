const path = require('path');

module.exports = {
  plugins: {
    // Explicitly point to the Tailwind config to avoid searchPath issues
    tailwindcss: { config: path.resolve(__dirname, 'tailwind.config.cjs') },
    autoprefixer: {},
  },
};
