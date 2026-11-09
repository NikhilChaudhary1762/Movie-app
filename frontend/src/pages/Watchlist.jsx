

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  Search,
  Play,
  Trash2,
  Film,
  Star,
  Clock,
  ArrowRight,
  Bookmark,
} from 'lucide-react'
import api from '../services/api'
import Navbar from '../components/Navbar'

export default function Watchlist() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true

    const fetchWatchlist = async () => {
      try {
        const { data } = await api.get('/watchlist')

        if (active) {
          setMovies(data.watchlist || [])
        }
      } catch (error) {
        console.error('Watchlist error:', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchWatchlist()

    return () => {
      active = false
    }
  }, [])

  const removeMovie = async (id) => {
    const confirmRemove = window.confirm(
      'Remove this movie from your watchlist?'
    )

    if (!confirmRemove) return

    try {
      await api.delete(`/watchlist/${id}`)

      setMovies((prev) =>
        prev.filter((movie) => movie._id !== id)
      )
    } catch (error) {
      console.error(error)
      alert('Unable to remove movie')
    }
  }

  const filteredMovies = movies.filter((movie) =>
    movie.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-white/5 bg-linear-to-br from-red-950/40 via-[#080808] to-[#080808]">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-red-600/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="mb-5 flex items-center gap-2 text-red-500">
            <Bookmark size={18} />
            <span className="text-xs font-bold uppercase tracking-[0.3em]">
              Your Collection
            </span>
          </div>

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
                My <span className="text-red-600">Watchlist</span>
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
                Your personal collection of movies.
                Save your favorites and watch them anytime.
              </p>

              <div className="mt-6 flex items-center gap-3 text-sm text-zinc-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 text-red-500">
                  <Heart size={20} />
                </div>
                <span>
                  <strong className="text-white">{movies.length}</strong>
                  {' '}movies saved in your collection
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:max-w-sm">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your watchlist..."
                className="w-full rounded-xl border border-white/10 bg-white/4 py-4 pl-12 pr-4 text-sm outline-none transition focus:border-red-500/50 focus:bg-white/6"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Watchlist Content */}
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-2/3 rounded-xl bg-zinc-800" />
                <div className="mt-3 h-4 w-3/4 rounded bg-zinc-800" />
                <div className="mt-2 h-3 w-1/2 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          /* Empty Watchlist */
          <div className="flex min-h-100 flex-col items-center justify-center rounded-3xl border border-white/5 bg-linear-to-b from-zinc-900/70 to-transparent px-6 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-600/10">
              <Heart size={42} className="text-red-500" />
            </div>

            <h2 className="text-2xl font-bold">
              Your watchlist is empty
            </h2>

            <p className="mt-3 max-w-md text-sm text-zinc-400">
              Discover amazing movies and add them to your
              personal collection.
            </p>

            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold transition hover:bg-red-700"
            >
              Explore Movies <ArrowRight size={18} />
            </Link>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="py-24 text-center">
            <Search size={40} className="mx-auto text-zinc-600" />
            <h2 className="mt-5 text-xl font-semibold">
              No movies found
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Try another search.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-7 flex items-center justify-between">
              <h2 className="text-xl font-bold sm:text-2xl">
                Saved Movies
              </h2>
              <span className="text-sm text-zinc-500">
                {filteredMovies.length} titles
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5 xl:grid-cols-6">
              {filteredMovies.map((movie) => (
                <div key={movie._id} className="group min-w-0">

                  {/* Poster */}
                  <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-zinc-900">
                    <Link to={`/movies/${movie._id}`}>
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                    </Link>

                    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/10 to-transparent opacity-70 transition group-hover:opacity-100" />

                    {/* Rating */}
                    {movie.rating && (
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-yellow-400 backdrop-blur">
                        <Star size={12} fill="currentColor" />
                        {movie.rating}
                      </div>
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => removeMovie(movie._id)}
                      title="Remove from watchlist"
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white opacity-100 transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>

                    {/* Play Overlay */}
                    <Link
                      to={`/movies/${movie._id}`}
                      className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-xl shadow-red-600/30 transition hover:scale-110">
                        <Play size={20} fill="white" />
                      </div>
                    </Link>
                  </div>

                  {/* Details */}
                  <div className="px-1 pt-3">
                    <Link to={`/movies/${movie._id}`}>
                      <h3 className="truncate text-sm font-semibold transition group-hover:text-red-500 sm:text-base">
                        {movie.title}
                      </h3>
                    </Link>

                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Film size={13} />
                        Movie
                      </span>

                      {movie.duration && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {movie.duration}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/movies/${movie._id}`}
                      className="mt-3 flex items-center gap-1 text-xs font-medium text-red-500 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      Watch Now <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-zinc-600">
        MovieFlex • Your movies, your collection
      </footer>
    </div>
  )
}
