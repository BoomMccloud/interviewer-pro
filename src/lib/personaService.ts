export interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  // Add other relevant fields here as your persona definition evolves
}

// For the MVP, we'll hardcode the personas.
// This could be expanded to load from a configuration file or database in the future.
const personas: Record<string, Persona> = {
  'technical-lead': {
    id: 'technical-lead',
    name: 'Technical Lead',
    // Corrected systemPrompt content
    systemPrompt: `Act as an experienced technical lead conducting an interview for a software engineering role.
You are looking for strong problem-solving skills, clear communication, and a good understanding of fundamental concepts.
Your goal is to assess the candidate's technical abilities and thought process based on their responses to your questions,
which should be derived from the provided job description and resume context.
Be professional, insightful, and aim to dig deeper into their understanding.
When providing feedback or suggesting alternatives, focus on being constructive and actionable.`,
    // Example of other potential fields:
    // greeting: "Hello, I'm the Technical Lead for this interview. Let's get started.",
    // avatarUrl: "/images/avatars/tech-lead.png",
  },
  // Example of how you might add another persona later:
  // 'hr-manager': {
  //   id: 'hr-manager',
  //   name: 'HR Manager',
  //   systemPrompt: "Act as an HR manager focusing on behavioral questions and cultural fit...",
  // },
};

/**
 * Retrieves a persona by its ID.
 * @param id The ID of the persona to retrieve.
 * @returns The persona object if found, otherwise null.
 */
export function getPersona(id: string): Persona | null {
  return personas[id] ?? null;
}