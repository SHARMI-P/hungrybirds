import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Redirects to /login (and back again afterwards). Optionally restricts by role.
const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;
