import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '~/components/UI/Button';

describe('Button Component', () => {
  test('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /Click Me/i })).toBeInTheDocument();
  });

  test('renders as a button element', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button', { name: /Test Button/i })).toBeInTheDocument();
  });

  test('calls onClick prop when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Handler Test</Button>);
    fireEvent.click(screen.getByRole('button', { name: /Click Handler Test/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('applies the base "button" class', () => {
    render(<Button>Class Test</Button>);
    expect(screen.getByRole('button', { name: /Class Test/i })).toHaveClass('button');
  });

  test('applies additional className props', () => {
    render(<Button className="custom-class">Custom Class Test</Button>);
    const button = screen.getByRole('button', { name: /Custom Class Test/i });
    expect(button).toHaveClass('button');
    expect(button).toHaveClass('custom-class');
  });

  test('passes other HTML button attributes', () => {
    render(<Button type="submit" disabled>Submit</Button>);
    const button = screen.getByRole('button', { name: /Submit/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeDisabled();
  });
}); 