/**
 * @fileoverview Component tests for the Input component.
 *
 * This file contains tests for the Input component using React Testing Library.
 * It ensures that the Input renders correctly with various props like placeholder and value,
 * and that its onChange handler is called appropriately when the input value changes.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '~/components/UI/Input'; // Assuming ~/ is aliased to src/

describe('Input component', () => {
  test('renders with a placeholder', () => {
    render(<Input placeholder="Enter text here" />);
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
  });

  test('renders with a given value', () => {
    render(<Input value="Initial value" onChange={jest.fn()} />); // onChange is often required for controlled inputs
    expect(screen.getByDisplayValue('Initial value')).toBeInTheDocument();
  });

  test('calls onChange prop when value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    const inputElement = screen.getByRole('textbox'); // Input fields typically have a role of textbox
    fireEvent.change(inputElement, { target: { value: 'new text' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    // Optionally, check if the argument to handleChange was the event or value
    // For example, if it passes the event: expect(handleChange).toHaveBeenCalledWith(expect.anything());
    // If it directly passes the value (less common for raw input, more common for custom components wrapping input):
    // expect(handleChange).toHaveBeenCalledWith('new text');
  });

  test('renders with type attribute if provided', () => {
    render(<Input type="password" placeholder="Password" />);
    const inputElement = screen.getByPlaceholderText('Password') as HTMLInputElement;
    expect(inputElement.type).toBe('password');
  });

  // Future tests could include:
  // - Testing disabled state.
  // - Testing with different input types (e.g., number, email) and their specific behaviors.
  // - Testing validation or error states if applicable.
}); 