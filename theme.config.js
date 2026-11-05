/** @type {const} */
const themeColors = {
  // High contrast colors for accessibility
  primary: { light: '#FFFF00', dark: '#FFFF00' }, // Bright yellow for high contrast
  background: { light: '#000000', dark: '#000000' }, // Black for maximum contrast
  surface: { light: '#F5F5F5', dark: '#1a1a1a' }, // Light gray/dark gray
  foreground: { light: '#FFFFFF', dark: '#FFFFFF' }, // White for text
  muted: { light: '#333333', dark: '#CCCCCC' }, // Dark gray/light gray for secondary text
  border: { light: '#000000', dark: '#FFFFFF' }, // High contrast borders
  success: { light: '#00CC00', dark: '#00FF00' }, // Bright green
  warning: { light: '#FF6600', dark: '#FFAA00' }, // Bright orange
  error: { light: '#FF0000', dark: '#FF3333' }, // Bright red
};

module.exports = { themeColors };
