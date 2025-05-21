/**
 * @fileoverview Component tests for the Button component.
 *
 * This file contains tests for the Button component using React Testing Library.
 * It ensures that the Button renders correctly, handles children,
 * defaults to a <button> HTML element, and responds to click events
 * by calling the onClick prop.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'; // Ensure jest-dom matchers are imported
import { Button } from '~/components/UI/Button'; // Assuming ~/ is aliased to src/

describe('Button component', () => {
  test('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    // Check role for better accessibility and to ensure it's perceived as a button
    expect(screen.getByRole('button', { name: /Click Me/i })).toBeInTheDocument();
  });

  test('renders as a button HTML element by default', () => {
    render(<Button>Test Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /Test Button/i });
    expect(buttonElement.tagName).toBe('BUTTON');
  });

  test('calls onClick prop when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    fireEvent.click(screen.getByRole('button', { name: /Clickable/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Future tests could include:
  // - Testing different variants and sizes if props for these exist and affect rendering.
  // - Testing the 'asChild' prop behavior if it's used.
  // - Testing disabled state.
}); 