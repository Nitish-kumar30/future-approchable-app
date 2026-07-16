import { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number; // 0..5, in 0.5 steps
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}

/**
 * 5-star rating with 0.5 increments. Click on left half of a star = .5, right half = whole.
 */
export function StarRating({ value, onChange, readOnly = false, size = 28 }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (readOnly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    onChange(star - (isHalf ? 0.5 : 0));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    setHover(star - (isHalf ? 0.5 : 0));
  };

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = shown >= star;
        const half = !filled && shown >= star - 0.5;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={(e) => handleClick(e, star)}
            onMouseMove={(e) => handleMouseMove(e, star)}
            className={cn(
              'relative transition-transform',
              !readOnly && 'hover:scale-110 cursor-pointer',
              readOnly && 'cursor-default'
            )}
            aria-label={`${star} stars`}
          >
            <Star
              size={size}
              className={cn(
                'text-muted-foreground/40',
                filled && 'fill-yellow-400 text-yellow-400',
              )}
            />
            {half && (
              <StarHalf
                size={size}
                className="absolute inset-0 fill-yellow-400 text-yellow-400"
              />
            )}
          </button>
        );
      })}
      {shown > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">{shown.toFixed(1)}</span>
      )}
    </div>
  );
}
