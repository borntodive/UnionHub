import { Link } from "react-router-dom";
import { Button } from "../components/Button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="text-gray-600">Pagina non trovata.</p>
      <Link to="/">
        <Button variant="outline">Torna alla home</Button>
      </Link>
    </div>
  );
}
