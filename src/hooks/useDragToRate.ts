import { useCallback, useRef, useState } from "react";

interface UseDragToRateOptions {
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChangeValue?: (value: number) => void;
}

interface UseDragToRateReturn {
  value: number | null;
  isDragging: boolean;
  bind: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
  setValueFromFraction: (fraction: number) => void;
  setValue: (v: number) => void;
}

export function useDragToRate({
  min,
  max,
  step,
  disabled = false,
  onChangeValue,
}: UseDragToRateOptions): UseDragToRateReturn {
  const [value, setValueState] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<{ left: number; width: number } | null>(null);
  const pointerId = useRef<number | null>(null);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => Math.round(v / step) * step;

  const fractionToValue = useCallback(
    (fraction: number) => {
      const raw = min + fraction * (max - min);
      return clamp(snap(raw));
    },
    [min, max, step]
  );

  const setValueFromFraction = useCallback(
    (fraction: number) => {
      if (disabled) return;
      const v = fractionToValue(fraction);
      setValueState(v);
      onChangeValue?.(v);
    },
    [fractionToValue, disabled, onChangeValue]
  );

  const setValue = useCallback(
    (v: number) => {
      if (disabled) return;
      const clamped = clamp(snap(v));
      setValueState(clamped);
      onChangeValue?.(clamped);
    },
    [disabled, min, max, step, onChangeValue]
  );

  const getFraction = (clientX: number) => {
    if (!trackRef.current) return 0;
    const { left, width } = trackRef.current;
    return Math.min(1, Math.max(0, (clientX - left) / width));
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      pointerId.current = e.pointerId;
      const rect = target.getBoundingClientRect();
      trackRef.current = { left: rect.left, width: rect.width };
      setIsDragging(true);
      setValueFromFraction(getFraction(e.clientX));
    },
    [disabled, setValueFromFraction]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || e.pointerId !== pointerId.current) return;
      setValueFromFraction(getFraction(e.clientX));
    },
    [isDragging, setValueFromFraction]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      setIsDragging(false);
      pointerId.current = null;
    },
    []
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      setIsDragging(false);
      pointerId.current = null;
    },
    []
  );

  return {
    value,
    isDragging,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    setValueFromFraction,
    setValue,
  };
}
