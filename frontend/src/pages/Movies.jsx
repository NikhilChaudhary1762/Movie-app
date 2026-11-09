
import { useCallback, useEffect,  useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Search,
  Play,
  Star,
  Film,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
  TrendingUp,
  X,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

function Movies() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 
const fetchMovies = useCallback(async () => {
  try {
    const response = await axios.get(`${API_URL}/movies`);

    const data = response.data.movies || response.data;

    setMovies(Array.isArray(data) ? data : []);

  } catch (err) {
    console.error("Movies fetch error:", err);
    setError("Unable to load movies.");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) fetchMovies();
    });

    return () => {
      active = false;
    };
  }, [fetchMovies]);


  const genres = [
    "All",
    "Action",
    "Comedy",
    "Drama",
    "Romance",
    "Thriller",
    "Horror",
    "Adventure",
    "Sci-Fi",
  ];

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const title = (movie.title || movie.name || "").toLowerCase();

      const matchesSearch = title.includes(search.toLowerCase());

      const movieGenres = Array.isArray(movie.genre)
        ? movie.genre
        : movie.genre
        ? [movie.genre]
        : [];

      const matchesGenre =
        genre === "All" ||
        movieGenres.some(
          (g) => g.toLowerCase() === genre.toLowerCase()
        );

      return matchesSearch && matchesGenre;
    });
  }, [movies, search, genre]);

  const featuredMovie = movies[0];

  const getPoster = (movie) =>
    movie.poster ||
    movie.posterUrl ||
    movie.thumbnail ||
    "https://placehold.co/400x600/18181b/ffffff?text=MovieFlex";

  const getGenres = (movie) =>
    Array.isArray(movie.genre)
      ? movie.genre.join(" • ")
      : movie.genre || "Entertainment";

  return (
    <div className="min-h-screen bg-[#08090d] text-white">

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-white/5">

        {/* Background */}
        <div className="absolute inset-0">
          {featuredMovie && (
            <img
              src={getPoster(featuredMovie)}
              alt=""
              className="h-full w-full object-cover opacity-20 blur-sm"
            />
          )}

          <div className="absolute inset-0 bg-linear-to-r from-[#08090d] via-[#08090d]/90 to-[#08090d]/50" />
          <div className="absolute inset-0 bg-linear-to-t from-[#08090d] via-transparent to-[#08090d]/60" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">

          {/* Hero Content */}
          <div className="max-w-3xl">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-400">
              <Sparkles size={14} />
              MovieFlex Originals
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-7xl">
              Discover
              <span className="block bg-linear-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
                Extraordinary
              </span>
              Movies.
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-gray-400 md:text-base">
              Your next cinematic adventure starts here.
              Explore amazing movies, discover hidden gems,
              and enjoy entertainment without limits.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">

              <button
                onClick={() =>
                  document
                    .getElementById("movie-library")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 font-semibold transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20"
              >
                <Play size={18} fill="white" />
                Explore Movies
              </button>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-gray-300 backdrop-blur">
                <Film size={18} className="text-red-400" />
                {movies.length} Movies Available
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ================= MOVIE LIBRARY ================= */}
      <main
        id="movie-library"
        className="mx-auto max-w-7xl px-5 py-12 md:px-10"
      >

        {/* Section Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-red-400">
              <TrendingUp size={16} />
              YOUR ENTERTAINMENT HUB
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Movie Library
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Browse, search and discover your favorite movies.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full md:max-w-sm">

            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            />

            <input
              type="text"
              placeholder="Search your favorite movie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#111217] py-4 pl-12 pr-12 text-sm outline-none transition focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={17} />
              </button>
            )}

          </div>

        </div>

        {/* Genre Filters */}
        <div className="mb-10 flex flex-wrap items-center gap-2">

          <div className="mr-2 flex items-center gap-2 text-sm text-gray-500">
            <SlidersHorizontal size={16} />
            Filter:
          </div>

          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                genre === g
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                  : "border border-white/5 bg-[#111217] text-gray-400 hover:border-white/10 hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}

        </div>

        {/* Results */}
        <div className="mb-6 flex items-center justify-between">

          <h3 className="text-lg font-semibold">
            {genre === "All" ? "All Movies" : `${genre} Movies`}
          </h3>

          <span className="text-sm text-gray-500">
            {filteredMovies.length} results
          </span>

        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">

                <div className="aspect-2/3 rounded-xl bg-[#18191f]" />

                <div className="mt-4 h-4 w-3/4 rounded bg-[#18191f]" />

                <div className="mt-3 h-3 w-1/2 rounded bg-[#18191f]" />

              </div>
            ))}

          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center">

            <Film size={48} className="mx-auto mb-4 text-red-400" />

            <h3 className="text-xl font-semibold">Something went wrong</h3>

            <p className="mt-2 text-gray-400">{error}</p>

            <button
              onClick={() => {
                setLoading(true);
                setError("");
                fetchMovies();
              }}
              className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-medium hover:bg-red-700"
            >
              Retry Loading
            </button>

          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredMovies.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-[#111217] py-20 text-center">

            <Film size={55} className="mx-auto mb-5 text-gray-600" />

            <h3 className="text-xl font-semibold">No Movies Found</h3>

            <p className="mt-3 text-sm text-gray-500">
              Try another search or genre.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setGenre("All");
              }}
              className="mt-6 rounded-lg bg-white/5 px-5 py-3 text-sm hover:bg-white/10"
            >
              Clear Filters
            </button>

          </div>
        )}

        {/* Movie Cards */}
        {!loading && !error && filteredMovies.length > 0 && (

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">

            {filteredMovies.map((movie) => (

              <Link
                to={`/movies/${movie._id}`}
                key={movie._id}
                className="group min-w-0"
              >

                {/* Poster */}
                <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-[#18191f] shadow-lg">

                  <img
                    src={getPoster(movie)}
                    alt={movie.title || "Movie"}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />

                  {/* Dark Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-black/20 opacity-70 transition group-hover:opacity-100" />

                  {/* Rating */}
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 text-xs font-semibold backdrop-blur">
                    <Star size={13} className="fill-yellow-400 text-yellow-400" />
                    {movie.rating || "N/A"}
                  </div>

                  {/* Quality */}
                  {movie.quality && (
                    <div className="absolute right-3 top-3 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase">
                      {movie.quality}
                    </div>
                  )}

                  {/* Hover Play */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-xl shadow-red-600/30 transition duration-300 group-hover:scale-110">
                      <Play size={23} fill="white" />
                    </div>
                  </div>

                  {/* Poster Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">

                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-300">
                      <span>{movie.releaseYear || movie.year || "Movie"}</span>
                      <span>•</span>
                      <span className="truncate">{getGenres(movie)}</span>
                    </div>

                    <h3 className="line-clamp-2 text-sm font-bold leading-5 transition group-hover:text-red-400 md:text-base">
                      {movie.title || movie.name}
                    </h3>

                  </div>

                </div>

                {/* Card Footer */}
                <div className="mt-3 flex items-center justify-between">

                  <span className="truncate text-xs text-gray-500">
                    {movie.language || "Available Now"}
                  </span>

                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-red-400">
                    Details
                    <ChevronRight size={14} className="transition group-hover:translate-x-1" />
                  </span>

                </div>

              </Link>

            ))}

          </div>

        )}

      </main>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-10">

        <div className="relative overflow-hidden rounded-2xl border border-red-500/10 bg-linear-to-r from-red-950/40 via-[#151116] to-[#111217] p-8 md:p-12">

          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-red-600/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-red-400">
                <Sparkles size={16} />
                MOVIEFLEX EXPERIENCE
              </div>

              <h2 className="text-2xl font-bold md:text-3xl">
                Your next favorite movie awaits.
              </h2>

              <p className="mt-3 text-sm text-gray-400">
                Discover stories worth watching.
              </p>
            </div>

            <Link
              to="/series"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 font-medium transition hover:bg-white/10"
            >
              Explore Series
              <ChevronRight size={18} />
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Movies;
