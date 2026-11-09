

import { Link } from 'react-router-dom'

export default function MovieCard({ movie }) {
  return (
    <Link
      to={`/movies/${movie._id}`}
      className="group relative block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.25)]"
    >
      {/* Poster */}
      <div className="relative aspect-2/3 overflow-hidden">
        <img
          src={movie.poster || 'https://placehold.co/400x600?text=No+Poster'}
          alt={movie.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Rating */}
        <div className="absolute right-3 top-3 rounded-lg bg-black/80 px-3 py-1 text-sm font-bold text-yellow-400 backdrop-blur">
          ⭐ {movie.rating || 'N/A'}
        </div>

        {/* Hover Content */}
        <div className="absolute inset-x-0 bottom-0 translate-y-4 p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <h3 className="mb-2 line-clamp-2 text-xl font-bold text-white">
            {movie.title}
          </h3>

          <div className="mb-3 flex flex-wrap gap-2 text-xs text-zinc-300">
            {movie.releaseDate && (
              <span>{new Date(movie.releaseDate).getFullYear()}</span>
            )}

            {movie.language && <span>• {movie.language}</span>}

            {movie.duration && <span>• {movie.duration} min</span>}
          </div>

          {movie.genres?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {movie.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full bg-zinc-800/90 px-2 py-1 text-xs text-zinc-300"
                >
                  {genre}
                </span>
              ))}
          </div>
          )}

          {/* Watch Details */}
          <div className="rounded-lg bg-red-600 py-2 text-center font-semibold text-white transition-colors group-hover:bg-red-700">
            ▶ Watch Details
          </div>
        </div>
      </div>

      {/* Card Title */}
      <div className="p-4 transition-opacity duration-300 group-hover:opacity-0">
        <h3 className="truncate text-lg font-bold text-white">
          {movie.title}
        </h3>

        <p className="mt-1 text-sm text-zinc-400">
          {movie.language || 'Movie'}
        </p>
      </div>
    </Link>
  )
}
