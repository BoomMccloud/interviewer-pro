/**
 * @fileoverview Component tests for the Spinner component.
 *
 * This file contains tests for the Spinner component using React Testing Library.
 * It ensures that the Spinner renders correctly.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Spinner from '~/components/UI/Spinner'; // Corrected to default import

describe('Spinner component', () => {
  test('renders the spinner', () => {
    render(<Spinner />);
    // Spinners often have an ARIA role like "status" for accessibility or a test ID.
    // If the Spinner is a simple div with CSS animations, we might need to check for a specific class or structure.
    // For now, let's assume it renders a container that can be found by a test ID or a common role.
    // If Spinner.tsx has a specific data-testid, use that. Otherwise, adjust as needed.
    const spinnerElement = screen.getByRole('status'); // Common role for loading spinners
    expect(spinnerElement).toBeInTheDocument();
  });

  // Future tests could include:
  // - Testing different sizes if the Spinner component accepts size props.
  // - Testing different colors or styles if applicable.
  // - Testing visibility if controlled by a prop.
}); 