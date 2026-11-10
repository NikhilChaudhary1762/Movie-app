
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./AdminDashboard.css";
import MovieUpload from "../components/MovieUpload";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

const initialFormData = {
  title: "",
  description: "",
  poster: "",
  trailerUrl: "",
  watchUrl: "",
  downloadUrl: "",
  rating: "",
  duration: "",
  language: "",
  genres: "",
  releaseDate: "",
  featured: false,
};

const chartColors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function Admin() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const [message, setMessage] = useState({ text: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const moviesPerPage = 10;

  // FETCH MOVIES
  const loadMovies = async () => {
    const response = await api.get("/movies");
    const movieData = response.data.movies || response.data || [];
    return Array.isArray(movieData) ? movieData : [];
  };

  const fetchMovies = async () => {
    try {
      setMovies(await loadMovies());
    } catch (error) {
      console.error(error);
      setMessage({
        text: "Movies load nahi hui.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    loadMovies()
      .then((data) => {
        if (active) setMovies(data);
      })
      .catch((error) => {
        console.error(error);

        if (active) {
          setMessage({
            text: "Movies load nahi hui.",
            type: "error",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // STATISTICS
  const totalMovies = movies.length;

  const featuredMovies = movies.filter(
    (movie) => movie.featured
  ).length;

  const averageRating =
    totalMovies > 0
      ? (
          movies.reduce(
            (sum, movie) => sum + Number(movie.rating || 0),
            0
          ) / totalMovies
        ).toFixed(1)
      : "0.0";

  // GENRE ANALYTICS
  const genreChartData = movies.reduce((acc, movie) => {
    const genres = Array.isArray(movie.genres)
      ? movie.genres
      : [];

    genres.forEach((genre) => {
      const existing = acc.find(
        (item) => item.name === genre
      );

      if (existing) {
        existing.count++;
      } else {
        acc.push({ name: genre, count: 1 });
      }
    });

    return acc;
  }, []);

  // RATING ANALYTICS
  const ratingChartData = [
    { name: "0-2", count: 0 },
    { name: "2-4", count: 0 },
    { name: "4-6", count: 0 },
    { name: "6-8", count: 0 },
    { name: "8-10", count: 0 },
  ];

  movies.forEach((movie) => {
    const rating = Number(movie.rating || 0);

    if (rating < 2) ratingChartData[0].count++;
    else if (rating < 4) ratingChartData[1].count++;
    else if (rating < 6) ratingChartData[2].count++;
    else if (rating < 8) ratingChartData[3].count++;
    else ratingChartData[4].count++;
  });

  // MONTHLY ANALYTICS
  const monthlyMovieData = (() => {
    const currentYear = new Date().getFullYear();

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const data = months.map((month) => ({
      month,
      count: 0,
    }));

    movies.forEach((movie) => {
      if (!movie.createdAt) return;

      const date = new Date(movie.createdAt);

      if (date.getFullYear() === currentYear) {
        data[date.getMonth()].count++;
      }
    });

    return data;
  })();

  // LANGUAGE ANALYTICS
  const languageChartData = movies.reduce((acc, movie) => {
    const language = movie.language || "Unknown";

    const existing = acc.find(
      (item) => item.name === language
    );

    if (existing) {
      existing.count++;
    } else {
      acc.push({ name: language, count: 1 });
    }

    return acc;
  }, []);

  // TOP 5 MOVIES
  const topRatedMovies = [...movies]
    .sort(
      (a, b) =>
        Number(b.rating || 0) - Number(a.rating || 0)
    )
    .slice(0, 5);

  // GENRE OPTIONS
  const genreOptions = [
    "All",
    ...new Set(
      movies.flatMap((movie) =>
        Array.isArray(movie.genres)
          ? movie.genres
          : []
      )
    ),
  ];

  // FILTER MOVIES
  const filteredMovies = movies.filter((movie) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      movie.title?.toLowerCase().includes(search) ||
      movie.language?.toLowerCase().includes(search);

    const matchesGenre =
      selectedGenre === "All" ||
      movie.genres?.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

  // PAGINATION
  const totalPages = Math.ceil(
    filteredMovies.length / moviesPerPage
  );

  const startIndex =
    (currentPage - 1) * moviesPerPage;

  const paginatedMovies = filteredMovies.slice(
    startIndex,
    startIndex + moviesPerPage
  );

  // FORM HANDLERS
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // EDIT MOVIE
  const handleEdit = async (movie) => {
    let media = { watchUrl: "", downloadUrl: "" };
    try {
      const { data } = await api.get(`/movies/${movie._id}/access`);
      media = data.media || media;
    } catch (error) {
      console.error("Unable to load movie media links:", error);
    }

    setEditingMovie(movie);

    setFormData({
      title: movie.title || "",
      description: movie.description || "",
      poster: movie.poster || "",
      trailerUrl: movie.trailerUrl || "",
      watchUrl: media.storageWatchKey || media.watchUrl || "",
      downloadUrl: media.storageDownloadKey || media.downloadUrl || "",
      rating: movie.rating ?? "",
      duration: movie.duration ?? "",
      language: movie.language || "",
      genres: Array.isArray(movie.genres)
        ? movie.genres.join(", ")
        : "",
      releaseDate: movie.releaseDate
        ? movie.releaseDate.substring(0, 10)
        : "",
      featured: Boolean(movie.featured),
    });

    setShowForm(true);

    setMessage({
      text: "",
      type: "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // CANCEL FORM
  const handleCancel = () => {
    setShowForm(false);
    setEditingMovie(null);
    setFormData(initialFormData);
  };

  // ADD / UPDATE MOVIE
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (!editingMovie && !formData.watchUrl?.trim()) {
        setMessage({ text: "Please upload the movie video before saving.", type: "error" });
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        rating: Number(formData.rating),
        duration: Number(formData.duration),
        genres: formData.genres
          .split(",")
          .map((genre) => genre.trim())
          .filter(Boolean),
      };

      if (editingMovie) {
        await api.put(
          `/movies/${editingMovie._id}`,
          payload
        );

        setMessage({
          text: "Movie successfully updated!",
          type: "success",
        });
      } else {
        await api.post("/movies", payload);

        setMessage({
          text: "Movie successfully added!",
          type: "success",
        });
      }

      handleCancel();
      await fetchMovies();
    } catch (error) {
      console.error(error);

      setMessage({
        text:
          error.response?.data?.message ||
          "Movie save nahi hui.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // DELETE MOVIE
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Kya tum sach mein is movie ko delete karna chahte ho?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/movies/${id}`);

      setMessage({
        text: "Movie successfully deleted!",
        type: "success",
      });

      await fetchMovies();
    } catch (error) {
      console.error(error);

      setMessage({
        text: "Movie delete nahi hui.",
        type: "error",
      });
    }
  };

  // CSV EXPORT
  const exportCSV = () => {
    if (movies.length === 0) {
      setMessage({
        text: "Export karne ke liye movies available nahi hain.",
        type: "error",
      });
      return;
    }

    const headers = [
      "Title",
      "Rating",
      "Language",
      "Duration",
      "Genres",
      "Release Date",
      "Featured",
      "Watch URL",
      "Download URL",
    ];

    const escapeCSV = (value) => {
      const stringValue = String(value ?? "");
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const rows = movies.map((movie) => [
      movie.title,
      movie.rating,
      movie.language,
      movie.duration,
      Array.isArray(movie.genres)
        ? movie.genres.join(", ")
        : "",
      movie.releaseDate
        ? new Date(movie.releaseDate).toLocaleDateString()
        : "",
      movie.featured ? "Yes" : "No",
      movie.watchUrl,
      movie.downloadUrl,
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) =>
        row.map(escapeCSV).join(",")
      ),
    ].join("\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "movies-data.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // UI
  return (
    <div className="admin-dashboard min-h-screen bg-gray-950 p-4 text-white md:p-8">

      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-500 md:text-4xl">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-gray-400">
            Manage movies and analyze your movie database.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/series"
            className="rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700"
          >
            📺 Manage Web Series
          </Link>

          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setEditingMovie(null);
              setFormData(initialFormData);
            }}
            className="primary-btn"
          >
            {showForm ? "Close Form" : "+ Add Movie"}
          </button>
        </div>
      </div>

      {/* MESSAGE */}
      {message.text && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === "success"
              ? "success-message"
              : "error-message"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* STATISTICS */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="stat-card">
          <p className="text-gray-400">Total Movies</p>
          <h2 className="mt-2 text-3xl font-bold">
            {totalMovies}
          </h2>
        </div>

        <div className="stat-card">
          <p className="text-gray-400">Featured Movies</p>
          <h2 className="mt-2 text-3xl font-bold text-yellow-400">
            {featuredMovies}
          </h2>
        </div>

        <div className="stat-card">
          <p className="text-gray-400">Average Rating</p>
          <h2 className="mt-2 text-3xl font-bold text-green-400">
            {averageRating}/10
          </h2>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="dashboard-panel"
        >
          <h2 className="mb-6 text-2xl font-bold">
            {editingMovie ? "Edit Movie" : "Add New Movie"}
          </h2>

          {/* MOVIE UPLOAD - SEPARATE SECTION */}
          <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-4">
            <h3 className="mb-3 text-lg font-semibold text-red-400">
              🎬 Upload Movie Video
            </h3>

            <MovieUpload
              onUploaded={(url) => {
                setFormData((prev) => ({
                  ...prev,
                  watchUrl: url,
                }));

                setMessage({
                  text: "Video uploaded. Watch URL automatically filled!",
                  type: "success",
                });
              }}
            />

            {formData.watchUrl && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-green-400">
                  ✓ Video uploaded / Watch URL available
                </p>

                <input
                  type="text"
                  name="watchUrl"
                  value={formData.watchUrl}
                  onChange={handleChange}
                  placeholder="Watch URL"
                />
              </div>
            )}
          </div>

          {/* MOVIE DETAILS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Movie Title"
              required
            />

            <input
              name="poster"
              type="url"
              value={formData.poster}
              onChange={handleChange}
              placeholder="Poster URL"
              required
            />

            <input
              name="trailerUrl"
              type="url"
              value={formData.trailerUrl}
              onChange={handleChange}
              placeholder="Trailer URL"
            />

            {/* DOWNLOAD URL */}
            <div className="url-input-group">
              <label htmlFor="downloadUrl">
                ⬇ Download URL
              </label>

              <input
                id="downloadUrl"
                name="downloadUrl"
                type="url"
                value={formData.downloadUrl}
                onChange={handleChange}
                placeholder="Official download URL"
              />

              <p className="url-help">
                Official or authorized movie download link.
              </p>
            </div>

            <input
              name="rating"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={formData.rating}
              onChange={handleChange}
              placeholder="Rating (0-10)"
              required
            />

            <input
              name="duration"
              type="number"
              min="1"
              value={formData.duration}
              onChange={handleChange}
              placeholder="Duration (minutes)"
              required
            />

            <input
              name="language"
              value={formData.language}
              onChange={handleChange}
              placeholder="Language"
              required
            />

            <input
              name="genres"
              value={formData.genres}
              onChange={handleChange}
              placeholder="Genres (Action, Drama, Comedy)"
            />

            <input
              name="releaseDate"
              type="date"
              value={formData.releaseDate}
              onChange={handleChange}
            />
          </div>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Movie Description"
            rows="4"
            className="mt-4 w-full"
          />

          <label className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              name="featured"
              checked={formData.featured}
              onChange={handleChange}
              className="w-auto!"
            />
            Featured Movie
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="primary-btn disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingMovie
                  ? "Update Movie"
                  : "Add Movie"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="secondary-btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ANALYTICS */}
      <div className="mb-10">
        <h2 className="mb-6 text-2xl font-bold">
          Advanced Analytics
        </h2>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="chart-card">
            <h3 className="mb-4 text-lg font-semibold">
              Movies by Genre
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genreChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="mb-4 text-lg font-semibold">
              Movie Rating Distribution
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ratingChartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {ratingChartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="chart-card">
            <h3 className="mb-4 text-lg font-semibold">
              Monthly Movie Additions
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyMovieData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#22c55e"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <p className="mt-2 text-xs text-gray-500">
              Current year movie additions.
            </p>
          </div>

          <div className="chart-card">
            <h3 className="mb-4 text-lg font-semibold">
              Movies by Language
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={languageChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP 5 */}
        <div className="dashboard-panel">
          <h3 className="mb-4 text-xl font-semibold">
            Top 5 Rated Movies
          </h3>

          {topRatedMovies.length === 0 ? (
            <p className="text-gray-400">
              No movies available.
            </p>
          ) : (
            <div className="space-y-3">
              {topRatedMovies.map((movie, index) => (
                <div
                  key={movie._id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-gray-800 p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-red-400">
                      #{index + 1}
                    </span>

                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="h-16 w-12 rounded object-cover"
                    />

                    <div>
                      <p className="font-semibold">
                        {movie.title}
                      </p>

                      <p className="text-sm text-gray-400">
                        {movie.language || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <span className="font-bold text-yellow-400">
                    ⭐ {Number(movie.rating || 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CSV EXPORT */}
        <button
          type="button"
          onClick={exportCSV}
          className="primary-btn mt-6"
        >
          Export Movie Data CSV
        </button>
      </div>

      {/* MANAGE MOVIES */}
      <div className="dashboard-panel">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold">
            Manage Movies
          </h2>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search title or language..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />

            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setCurrentPage(1);
              }}
            >
              {genreOptions.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MOVIE TABLE */}
        {loading ? (
          <div className="py-10 text-center">
            <p className="animate-pulse text-gray-400">
              Loading movies...
            </p>
          </div>
        ) : paginatedMovies.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400">
              No movies found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Poster</th>
                  <th>Movie</th>
                  <th>Rating</th>
                  <th>Language</th>
                  <th>Genres</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedMovies.map((movie) => (
                  <tr key={movie._id}>
                    <td>
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="h-20 w-14 rounded object-cover"
                      />
                    </td>

                    <td>
                      <p className="font-semibold">
                        {movie.title}
                      </p>

                      {movie.featured && (
                        <span className="text-xs text-yellow-400">
                          ⭐ Featured
                        </span>
                      )}
                    </td>

                    <td className="text-yellow-400">
                      ⭐ {movie.rating}
                    </td>

                    <td>{movie.language}</td>

                    <td>
                      {Array.isArray(movie.genres)
                        ? movie.genres.join(", ")
                        : ""}
                    </td>

                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(movie)}
                          className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(movie._id)}
                          className="rounded bg-red-600 px-3 py-2 text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((prev) => prev - 1)
              }
              className="secondary-btn disabled:opacity-30"
            >
              Previous
            </button>

            <span className="text-gray-400">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => prev + 1)
              }
              className="secondary-btn disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
