import { capitalizeFirstLetter } from '../formatters';

describe('Formatters', () => {
  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter of a string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
    });

    it('should return an empty string if input is empty', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    it('should handle already capitalized string', () => {
      expect(capitalizeFirstLetter('World')).toBe('World');
    });
  });
}); 