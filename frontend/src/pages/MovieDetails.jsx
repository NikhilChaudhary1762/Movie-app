
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const getYouTubeEmbedUrl = (url) => {
  try {
    const parsedUrl = new URL(url)
    let videoId = ''

    if (parsedUrl.hostname.includes('youtu.be')) {
      videoId = parsedUrl.pathname.slice(1)
    } else if (parsedUrl.hostname.includes('youtube.com')) {
      if (parsedUrl.pathname === '/watch') {
        videoId = parsedUrl.searchParams.get('v')
      } else if (
        parsedUrl.pathname.startsWith('/embed/') ||
        parsedUrl.pathname.startsWith('/shorts/')
      ) {
        videoId = parsedUrl.pathname.split('/')[2]
      }
    }

    if (!videoId) return ''

    return `https://www.youtube-nocookie.com/embed/${videoId}`
  } catch {
    return ''
  }
}

export default function MovieDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const [movie, setMovie] = useState(null)
  const [allMovies, setAllMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [watchlistMessage, setWatchlistMessage] = useState('')
  const [videoError, setVideoError] = useState(false)
  const [mediaAccess, setMediaAccess] = useState(null)
  const [mediaLoading, setMediaLoading] = useState(false)

  const requireLogin = (returnTo = `${location.pathname}${location.hash}`) => {
    if (isAuthenticated) return true
    navigate('/login', {
      state: { from: returnTo },
    })
    return false
  }

  const openMovie = () => {
    if (!requireLogin(`${location.pathname}#watch`)) return
    document.getElementById('watch')?.scrollIntoView({ behavior: 'smooth' })
  }

  const downloadMovie = async () => {
    if (!requireLogin()) return
    try {
      setMediaLoading(true)
      const { data } = await api.get(`/movies/${id}/access`)
      const url = (data.media || data).downloadUrl
      if (!url) {
        setWatchlistMessage('Download is not available for this movie.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setWatchlistMessage(error.response?.data?.message || 'Unable to get download link.')
    } finally {
      setMediaLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadMediaAccess = async () => {
      if (!isAuthenticated) {
        setMediaAccess(null)
        return
      }
      try {
        setMediaLoading(true)
        const { data } = await api.get(`/movies/${id}/access`)
        if (!cancelled) setMediaAccess(data.media || data)
      } catch (error) {
        if (!cancelled) setMediaAccess(null)
      } finally {
        if (!cancelled) setMediaLoading(false)
      }
    }
    loadMediaAccess()
    return () => { cancelled = true }
  }, [id, isAuthenticated])

  // FETCH MOVIE DETAILS
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError('')
      setVideoError(false)

      try {
        const [movieResponse, moviesResponse] = await Promise.all([
          api.get(`/movies/${id}`),
          api.get('/movies'),
        ])

        if (cancelled) return

        setMovie(movieResponse.data.movie || movieResponse.data)

        const moviesData =
          moviesResponse.data.movies || moviesResponse.data

        setAllMovies(Array.isArray(moviesData) ? moviesData : [])
      } catch (err) {
        console.error(err)

        if (!cancelled) {
          setError('Unable to load movie details')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [id])

  // CHECK WATCHLIST
  useEffect(() => {
    let cancelled = false

    const checkWatchlist = async () => {
      if (!localStorage.getItem('token')) {
        setIsInWatchlist(false)
        return
      }

      try {
        const { data } = await api.get('/watchlist')

        if (cancelled) return

        const exists = data.watchlist?.some(
          (item) => item._id === id
        )

        setIsInWatchlist(Boolean(exists))
      } catch (error) {
        console.error('Watchlist error:', error)
      }
    }

    checkWatchlist()

    return () => {
      cancelled = true
    }
  }, [id])

  // TOGGLE WATCHLIST
  const toggleWatchlist = async () => {
    if (!localStorage.getItem('token')) {
      setWatchlistMessage('Please login first')
      return
    }

    setWatchlistLoading(true)
    setWatchlistMessage('')

    try {
      if (isInWatchlist) {
        await api.delete(`/watchlist/${id}`)
        setIsInWatchlist(false)
        setWatchlistMessage('Removed from Watchlist')
      } else {
        await api.post('/watchlist', { movieId: id })
        setIsInWatchlist(true)
        setWatchlistMessage('Added to Watchlist ❤️')
      }
    } catch (error) {
      setWatchlistMessage(
        error.response?.data?.message ||
        'Something went wrong'
      )
    } finally {
      setWatchlistLoading(false)
    }
  }

  // SIMILAR MOVIES
  const similarMovies = allMovies
    .filter(
      (item) =>
        item._id !== movie?._id &&
        movie?.genres?.some((genre) =>
          item.genres?.includes(genre)
        )
    )
    .slice(0, 4)

  // LOADING
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="animate-pulse text-lg text-red-500">
          Loading MovieFlix...
        </p>
      </div>
    )
  }

  // ERROR
  if (error || !movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-zinc-950 text-white">
        <p className="text-red-400">
          {error || 'Movie not found'}
        </p>

        <Link to="/" className="text-red-500 hover:text-red-400">
          ← Back to Home
        </Link>
      </div>
    )
  }

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : 'N/A'

  const trailerEmbedUrl = movie.trailerUrl
    ? getYouTubeEmbedUrl(movie.trailerUrl)
    : ''

  return (
    <div className="min-h-screen overflow-hidden bg-zinc-950 text-white">

      {/* HERO */}
      <section
        className="relative min-h-[85vh] bg-cover bg-center"
        style={{
          backgroundImage: movie.poster
            ? `url("${movie.poster}")`
            : 'none',
        }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/85 to-black/30" />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-black/40" />
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-red-600/20 blur-[150px]" />

        <div className="relative mx-auto flex min-h-[85vh] max-w-7xl items-center px-6 py-16 md:px-12">
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-center md:gap-12 md:text-left">

            {/* POSTER */}
            <div className="group shrink-0">
              <img
                src={movie.poster || 'https://placehold.co/400x600?text=No+Poster'}
                alt={movie.title}
                className="w-40 rounded-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] transition duration-500 group-hover:-translate-y-2 group-hover:scale-105 sm:w-52 md:w-64 lg:w-72"
              />
            </div>

            {/* MOVIE INFORMATION */}
            <div className="max-w-3xl">
              {movie.featured && (
                <span className="mb-5 inline-block rounded-full bg-linear-to-r from-yellow-500 to-orange-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-lg">
                  ⭐ Featured Movie
                </span>
              )}

              <h1 className="bg-linear-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-3xl font-extrabold leading-tight text-transparent sm:text-4xl md:text-6xl lg:text-7xl">
                {movie.title}
              </h1>

              {/* METADATA */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <span className="rounded-lg bg-yellow-500/10 px-3 py-2 font-bold text-yellow-400">
                  ⭐ {movie.rating || 'N/A'}/10
                </span>

                <span className="rounded-lg bg-white/10 px-3 py-2">
                  📅 {year}
                </span>

                <span className="rounded-lg bg-white/10 px-3 py-2">
                  ⏱ {movie.duration || 'N/A'} min
                </span>

                <span className="rounded-lg bg-white/10 px-3 py-2">
                  🌐 {movie.language || 'N/A'}
                </span>
              </div>

              {/* GENRES */}
              <div className="mt-6 flex flex-wrap gap-3">
                {movie.genres?.map((genre, index) => (
                  <span
                    key={genre}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold shadow-lg transition duration-300 hover:-translate-y-1 ${
                      index % 3 === 0
                        ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : index % 3 === 1
                          ? 'border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                          : 'border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                    }`}
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* DESCRIPTION */}
              <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
                {movie.description || 'Discover this movie on MovieFlix.'}
              </p>

              {/* ACTION BUTTONS */}
              <div className="mt-8 flex flex-wrap gap-4">

                {movie.hasWatchUrl && (
                  <button
                    type="button"
                    onClick={openMovie}
                    className="rounded-xl bg-linear-to-r from-red-600 to-red-500 px-7 py-3.5 font-bold text-white shadow-lg shadow-red-600/25 transition hover:-translate-y-1"
                  >
                    ▶ Watch Movie
                  </button>
                )}

                {trailerEmbedUrl && (
                  <a
                    href="#trailer"
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 font-bold text-white transition hover:bg-white/20"
                  >
                    🎬 Watch Trailer
                  </a>
                )}

                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                  className="rounded-xl border border-pink-500/40 bg-pink-500/10 px-6 py-3.5 font-semibold text-pink-300 transition hover:border-pink-500 hover:bg-pink-500/20 disabled:opacity-50"
                >
                  {watchlistLoading
                    ? 'Please wait...'
                    : isInWatchlist
                      ? '❤️ Remove from Watchlist'
                      : '🤍 Add to Watchlist'}
                </button>

                <Link
                  to="/"
                  className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-6 py-3.5 font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  ← Home
                </Link>

                {movie.hasDownloadUrl && (
                  <button
                    type="button"
                    onClick={downloadMovie}
                    disabled={mediaLoading}
                    className="rounded-xl border border-green-500/40 bg-green-500/10 px-6 py-3.5 font-bold text-green-400 transition hover:border-green-500 hover:bg-green-500/20 disabled:opacity-50"
                  >
                    {mediaLoading ? 'Please wait...' : '⬇ Download'}
                  </button>
                )}
              </div>

              {watchlistMessage && (
                <p className="mt-4 text-sm text-pink-400">
                  {watchlistMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MOVIE INFORMATION */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-red-500">
            Movie Details
          </p>

          <h2 className="text-3xl font-extrabold md:text-4xl">
            Movie <span className="text-red-500">Information</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">Release Year</p>
            <h3 className="mt-2 text-xl font-bold">📅 {year}</h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">Runtime</p>
            <h3 className="mt-2 text-xl font-bold">
              ⏱ {movie.duration || 'N/A'} min
            </h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-500">Language</p>
            <h3 className="mt-2 text-xl font-bold">
              🌐 {movie.language || 'N/A'}
            </h3>
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-5 font-bold text-yellow-400">
            ⭐ {movie.rating || 'N/A'}/10
          </div>
        </div>
      </section>

      {/* ONLINE WATCH PLAYER */}
      {movie.hasWatchUrl && (
        <section
          id="watch"
          className="mx-auto max-w-7xl px-6 py-16 md:px-10"
        >
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-red-500">
              MovieFlix Streaming
            </p>

            <h2 className="text-3xl font-extrabold md:text-5xl">
              Watch Movie <span className="text-red-500">▶</span>
            </h2>

            <p className="mt-3 text-zinc-400">
              Watch your authorized video directly on MovieFlix.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl">
            {!isAuthenticated ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-lg font-semibold text-white">Login required to watch this movie</p>
                <p className="text-sm text-zinc-400">Create a free account or login to start watching.</p>
                <button onClick={() => requireLogin()} className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white">Login / Sign up</button>
              </div>
            ) : mediaLoading ? (
              <div className="flex aspect-video items-center justify-center text-zinc-300">Loading secure video...</div>
            ) : !mediaAccess?.watchUrl ? (
              <div className="flex aspect-video items-center justify-center text-zinc-400">Video link is not available.</div>
            ) : videoError ? (
              <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-red-400">
                  Video load nahi ho paya.
                </p>
                <p className="text-sm text-zinc-400">
                  MP4 URL, server access aur video format check karein.
                </p>
              </div>
            ) : (
              <video
                key={mediaAccess.watchUrl}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black"
                onError={() => setVideoError(true)}
              >
                <source
                  src={mediaAccess.watchUrl?.startsWith("https://s3.") && mediaAccess.watchUrl.includes("backblazeb2.com")
                    ? `${(api.defaults.baseURL || "").replace(/\/$/, "")}/movies/${id}/stream?token=${encodeURIComponent(localStorage.getItem("token") || "")}`
                    : mediaAccess.watchUrl}
                  type="video/mp4"
                />
                Your browser does not support video playback.
              </video>
            )}
          </div>
        </section>
      )}

      {/* TRAILER */}
      <section
        id="trailer"
        className="mx-auto max-w-7xl px-6 py-16 md:px-10"
      >
        <div className="mb-8">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-red-500">
            MovieFlix Exclusive
          </p>

          <h2 className="text-3xl font-extrabold md:text-5xl">
            Watch Trailer <span className="text-red-500">🎬</span>
          </h2>
        </div>

        {trailerEmbedUrl ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black shadow-2xl">
            <div className="aspect-video">
              <iframe
                src={trailerEmbedUrl}
                title={`${movie.title} Trailer`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/50 text-center">
            <span className="mb-4 text-5xl">🎬</span>
            <h3 className="text-xl font-bold text-white">
              Trailer Coming Soon
            </h3>
            <p className="mt-2 text-zinc-400">
              Trailer is currently unavailable for this movie.
            </p>
          </div>
        )}
      </section>

      {/* SIMILAR MOVIES */}
      {similarMovies.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="mb-8">
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.3em] text-red-500">
              You May Also Like
            </p>

            <h2 className="text-3xl font-extrabold md:text-4xl">
              Similar Movies <span className="text-red-500">🎬</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {similarMovies.map((similar) => (
              <Link
                key={similar._id}
                to={`/movies/${similar._id}`}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg transition duration-300 hover:-translate-y-2 hover:border-red-500"
              >
                <img
                  src={similar.poster || 'https://placehold.co/400x600?text=No+Poster'}
                  alt={similar.title}
                  className="aspect-2/3 w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="p-4">
                  <h3 className="truncate font-bold text-white transition group-hover:text-red-400">
                    {similar.title}
                  </h3>

                  <p className="mt-2 text-sm text-yellow-400">
                    ⭐ {similar.rating || 'N/A'}/10
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
