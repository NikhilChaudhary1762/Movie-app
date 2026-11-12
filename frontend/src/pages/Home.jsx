
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Navbar from '../components/Navbar'
import MovieCard from '../components/MovieCard'

const SITE_URL = 'https://movieflex98.onrender.com'

function setMeta(name, content, attribute = 'name') {
  let element = document.head.querySelector(
    `meta[${attribute}="${name}"]`
  )

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

export default function Home() {
  const [movies, setMovies] = useState([])
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('All')
  const [language, setLanguage] = useState('All')
  const [sort, setSort] = useState('default')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Homepage SEO
  useEffect(() => {
    const title = 'MovieFlex - Discover Movies and Web Series'
    const description =
      'Explore movies and web series on MovieFlex. Discover entertainment by genre, language, ratings and release year.'

    document.title = title

    setMeta('description', description)
    setMeta('robots', 'index, follow')
    setMeta('og:title', title, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('og:url', `${SITE_URL}/`, 'property')
    setMeta('og:site_name', 'MovieFlex', 'property')
    setMeta('twitter:card', 'summary')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)

    let canonical = document.querySelector(
      'link[rel="canonical"]'
    )

    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }

    canonical.href = `${SITE_URL}/`

    // Website structured data
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MovieFlex',
      url: `${SITE_URL}/`,
      description,
    }

    let script = document.getElementById('homepage-schema')

    if (!script) {
      script = document.createElement('script')
      script.id = 'homepage-schema'
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }

    script.textContent = JSON.stringify(schema)

    return () => {
      script?.remove()
    }
  }, [])

  // Fetch Movies
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const { data } = await api.get('/movies')
        setMovies(data.movies || [])
      } catch (err) {
        console.error('Movie fetch error:', err)
        setError('Unable to load movies')
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [])

  // Featured Movie
  const featuredMovie =
    movies.find((movie) => movie.featured) || movies[0]

  // Search + Genre + Language Filter
  const filteredMovies = movies
    .filter((movie) => {
      const matchesSearch = movie.title
        ?.toLowerCase()
        .includes(search.toLowerCase())

      const matchesGenre =
        genre === 'All' || movie.genres?.includes(genre)

      const matchesLanguage =
        language === 'All' || movie.language === language

      return matchesSearch && matchesGenre && matchesLanguage
    })
    .sort((a, b) => {
      if (sort === 'rating') {
        return (b.rating || 0) - (a.rating || 0)
      }

      if (sort === 'title') {
        return a.title.localeCompare(b.title)
      }

      if (sort === 'year') {
        return (
          new Date(b.releaseDate || 0) -
          new Date(a.releaseDate || 0)
        )
      }

      return 0
    })

  // Genre Options
  const genres = [
    'All',
    ...new Set(movies.flatMap((movie) => movie.genres || [])),
  ]

  // Language Options
  const languages = [
    'All',
    ...new Set(movies.map((movie) => movie.language).filter(Boolean)),
  ]

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 via-black to-zinc-950 text-white">

      <Navbar />

      {/* HERO BANNER */}
      {!loading && featuredMovie && (
        <section
          className="relative flex min-h-120 items-center overflow-hidden bg-zinc-900 md:min-h-150"
          style={{
            backgroundImage: featuredMovie.poster
              ? `url("${featuredMovie.poster}")`
              : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-black/30" />

          <div className="relative z-10 max-w-2xl px-6 py-16 md:px-16">

            <span className="mb-4 inline-block rounded bg-red-600 px-3 py-1 text-sm font-bold uppercase tracking-wider">
              MovieFlex Original
            </span>

            <h2 className="mb-5 text-4xl font-extrabold leading-tight md:text-6xl">
              {featuredMovie.title}
            </h2>

            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <span className="font-semibold text-green-400">
                ⭐ {featuredMovie.rating || 'N/A'}
              </span>

              <span>
                {featuredMovie.releaseDate
                  ? new Date(featuredMovie.releaseDate).getFullYear()
                  : ''}
              </span>

              <span>{featuredMovie.language}</span>

              <span>
                {featuredMovie.duration
                  ? `${featuredMovie.duration} min`
                  : ''}
              </span>
            </div>

            <p className="mb-8 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">
              {featuredMovie.description ||
                'Discover your next favorite movie on MovieFlex.'}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to={`/movies/${featuredMovie._id}`}
                className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-red-700 hover:shadow-red-500/30"
              >
                ▶ Watch Now
              </Link>

              <Link
                to={`/movies/${featuredMovie._id}`}
                className="rounded-lg bg-zinc-700/80 px-6 py-3 font-bold text-white transition hover:bg-zinc-600"
              >
                ℹ More Info
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* MAIN CONTENT */}
      <main className="mx-auto max-w-7xl px-6 py-10">

        <h1 className="bg-linear-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-3xl font-extrabold text-transparent md:text-5xl">
          Discover Movies and Web Series
        </h1>

        <p className="mt-3 text-zinc-400">
          Explore movies by genre, language and ratings on MovieFlex.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search movies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-8 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-white placeholder:text-zinc-500 shadow-lg transition-all duration-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
        />

        {/* Filters */}
        <div className="mt-5 flex flex-wrap gap-4">

          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white transition-all duration-300 hover:border-red-500 focus:border-red-500 focus:outline-none"
          >
            {genres.map((g) => (
              <option key={g} value={g}>
                {g === 'All' ? 'All Genres' : g}
              </option>
            ))}
          </select>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white transition-all duration-300 hover:border-red-500 focus:border-red-500 focus:outline-none"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'All' ? 'All Languages' : lang}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white transition-all duration-300 hover:border-red-500 focus:border-red-500 focus:outline-none"
          >
            <option value="default">Default Order</option>
            <option value="rating">Highest Rating</option>
            <option value="title">Title A-Z</option>
            <option value="year">Newest First</option>
          </select>

          <button
            onClick={() => {
              setSearch('')
              setGenre('All')
              setLanguage('All')
              setSort('default')
            }}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20"
          >
            Reset Filters
          </button>
        </div>

        {/* All Movies */}
        <h2 className="mb-6 mt-10 flex items-center gap-3 text-2xl font-bold text-white md:text-3xl">
          <span className="h-8 w-1.5 rounded-full bg-red-600"></span>
          All Movies
          <span className="rounded-lg bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
            {filteredMovies.length}
          </span>
        </h2>

        {loading && (
          <p className="text-zinc-400">Loading movies...</p>
        )}

        {error && (
          <p className="text-red-500">{error}</p>
        )}

        {!loading && !error && filteredMovies.length === 0 && (
          <p className="text-zinc-400">No movies found.</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredMovies.map((movie) => (
            <MovieCard
              key={movie._id}
              movie={movie}
            />
          ))}
        </div>

      </main>
    </div>
  )
}
