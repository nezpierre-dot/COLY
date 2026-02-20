import { Star } from "lucide-react";

interface StarRatingProps {
  score: number;
  total?: number;
  size?: number;
  showEmpty?: boolean;
}

const StarRating = ({ score, total, size = 14, showEmpty = true }: StarRatingProps) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={
              star <= Math.round(score)
                ? "fill-accent text-accent"
                : showEmpty
                ? "fill-muted text-muted-foreground/30"
                : "hidden"
            }
          />
        ))}
      </div>
      {score > 0 && (
        <span className="text-xs font-semibold text-foreground ml-0.5">
          {score.toFixed(1)}
        </span>
      )}
      {total !== undefined && (
        <span className="text-[11px] text-muted-foreground">({total})</span>
      )}
    </div>
  );
};

export default StarRating;
