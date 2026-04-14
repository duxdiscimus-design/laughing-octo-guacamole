import { Navigate, useLocation } from 'react-router-dom';
import { LS_KEYS } from '../constants';

export default function AuthGuard({ children }) {
  const session = localStorage.getItem(LS_KEYS.SESSION);
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
