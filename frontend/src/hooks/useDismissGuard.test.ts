import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDismissGuard } from './useDismissGuard';

describe('useDismissGuard', () => {
  it('calls onClose when form is clean', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDismissGuard(true, false, onClose));

    act(() => {
      result.current.requestClose();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.discardDialog.open).toBe(false);
  });

  it('opens discard dialog when form is dirty', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDismissGuard(true, true, onClose));

    act(() => {
      result.current.requestClose();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.discardDialog.open).toBe(true);
  });

  it('does not call onClose while discard dialog is open', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDismissGuard(true, true, onClose));

    act(() => {
      result.current.requestClose();
    });
    act(() => {
      result.current.requestClose();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.discardDialog.open).toBe(true);
  });

  it('confirms discard and closes', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDismissGuard(true, true, onClose));

    act(() => {
      result.current.requestClose();
    });
    act(() => {
      result.current.discardDialog.onConfirm();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.discardDialog.open).toBe(false);
  });
});
