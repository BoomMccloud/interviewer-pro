import { getPersona } from '../src/lib/personaService'; // Assuming this will be the export

describe('PersonaService', () => {
  describe('getPersona', () => {
    it('should return the correct persona object for a valid ID', () => {
      const personaId = 'technical-lead';
      const persona = getPersona(personaId);

      // Expected structure based on typical needs, can be adjusted
      const expectedPersona = {
        id: 'technical-lead',
        name: 'Technical Lead', // Example name
        systemPrompt: expect.any(String), // System prompt should be a string
        // Add any other fields that are part of your persona definition
      };

      expect(persona).toBeDefined();
      expect(persona).toEqual(expect.objectContaining(expectedPersona));
      expect(persona?.systemPrompt.length).toBeGreaterThan(0); // Ensure prompt is not empty
    });

    it('should return null for an invalid or non-existent persona ID', () => {
      const personaId = 'non-existent-persona';
      const persona = getPersona(personaId);

      expect(persona).toBeNull();
    });

    // Optional: Test for another valid persona if you plan to have more hardcoded ones soon
    // it('should return another specific persona correctly', () => {
    //   const personaId = 'another-valid-persona';
    //   const persona = getPersona(personaId);
    //   // ... assertions for this persona
    // });
  });
}); 