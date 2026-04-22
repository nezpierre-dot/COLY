import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  category?: string[] | string | null;
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Small visual marker used on mission cards.
 * Renders the matching premium 3D icon, with a soft tinted background.
 */
const CategoryIcon = ({ category, size = 40, className, rounded = true }: CategoryIconProps) => {
  const src = getCategoryIcon(category);
  return (
    <div
      className={cn(
        "shrink-0 flex items-center justify-center bg-primary/5 border border-primary/10",
        rounded ? "rounded-xl" : "",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        style={{ width: size - 6, height: size - 6 }}
        className="object-contain"
      />
    </div>
  );
};

export default CategoryIcon;
