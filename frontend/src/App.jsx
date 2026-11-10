
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Main Pages
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";

// Authentication
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Web Series Pages
import Series from "./pages/Series";
import SeriesDetails from "./pages/SeriesDetails";
import EpisodePlayer from "./pages/EpisodePlayer";

// User Pages
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";

// Admin Pages
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSeries from "./pages/AdminSeries";

// Protection
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Home Page */}
        <Route path="/" element={<Home />} />

        {/* Movies */}
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetails />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password"element={<ForgotPassword />}/>
        <Route path="/reset-password/:token"element={<ResetPassword />}/>

        {/* Web Series */}
        <Route path="/series" element={<Series />} />
        <Route path="/series/:id" element={<SeriesDetails />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/watch/episode/:id" element={<EpisodePlayer />} />
        </Route>

        {/* Protected User Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/watchlist" element={<Watchlist />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<Admin />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="series" element={<AdminSeries />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
