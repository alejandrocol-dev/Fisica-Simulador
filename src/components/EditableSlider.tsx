import { useState, useRef, useEffect } from 'react';

interface EditableSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  decimals?: number;
}

export default function EditableSlider({
  label, value, min, max, step, unit, onChange, decimals = 2
}: EditableSliderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditValue(value.toFixed(decimals));
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const confirmEdit = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') setIsEditing(false);
    e.stopPropagation();
  };

  return (
    <div className="slider-container" style={{ marginBottom: 12 }}>
      <div className="slider-label">
        <span className="slider-label-name">{label}</span>
        {isEditing ? (
          <span className="slider-edit-wrap">
            <input
              ref={inputRef}
              type="number"
              className="number-input"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              step={step}
              style={{ width: 65 }}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>
          </span>
        ) : (
          <span
            className="slider-label-value editable"
            onClick={startEditing}
            title="Click para editar con teclado"
          >
            {value.toFixed(decimals)} {unit}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}
