import { Navigate, useParams } from "react-router-dom";

/**
 * Short link /t/:id → redirects to the full public voyage page.
 * Used for WhatsApp/Telegram sharing (nidit.fr/t/abc123).
 */
export default function ShortVoyageRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/explore" replace />;
  return <Navigate to={`/trajet/${id}`} replace />;
}
