import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);
    
    const overlay = screen.getByTestId('modal-overlay');
    await user.click(overlay);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when modal content is clicked', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} />);
    
    const modalContent = screen.getByText('Modal content');
    await user.click(modalContent);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should close when Escape key is pressed', () => {
    render(<Modal {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should render with custom size', () => {
    render(<Modal {...defaultProps} size="lg" />);
    
    const modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveClass('max-w-2xl');
  });

  it('should render without close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);
    
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('should prevent closing when closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    render(<Modal {...defaultProps} closeOnOverlayClick={false} />);
    
    const overlay = screen.getByTestId('modal-overlay');
    await user.click(overlay);
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should prevent closing when closeOnEscape is false', () => {
    render(<Modal {...defaultProps} closeOnEscape={false} />);
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    render(<Modal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
  });

  it('should focus trap within modal', () => {
    render(<Modal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(document.activeElement).toBe(modal);
  });
});