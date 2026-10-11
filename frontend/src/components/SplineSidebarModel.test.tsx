// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SplineSidebarModel from './SplineSidebarModel';

describe('SplineSidebarModel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders sidebar region with accessible label', () => {
    render(<SplineSidebarModel />);
    const region = screen.getByRole('region', {
      name: /interactive 3d agricultural digital twin in sidebar/i,
    });
    expect(region).toBeDefined();
  });

  it('displays loading state while script is initializing', () => {
    render(<SplineSidebarModel />);
    const loadingTexts = screen.getAllByText(/Loading 3D Twin/i);
    expect(loadingTexts.length).toBeGreaterThan(0);
    const badgeTexts = screen.getAllByText(/Agri-Avatar 3D/i);
    expect(badgeTexts.length).toBeGreaterThan(0);
  });

  it('contains interaction hint badge', () => {
    render(<SplineSidebarModel />);
    const hint = screen.getByText(/Rotate 3D/i);
    expect(hint).toBeDefined();
  });
});
