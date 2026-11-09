
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Play,
  ChevronDown,
  ArrowLeft,
  Clock,
  Tv,
  PlayCircle,
  CheckCircle,
  Sparkles,
} from "lucide-react";

import api from "../services/api";
import Navbar from "../components/Navbar";

const SeriesDetails = () => {
  const { id } = useParams();

  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [season, setSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/series/${id}`);
        const data = res.data.series || res.data;

        setSeries(data);
        setSeason(1);
      } catch (err) {
        console.error(err);
        setError("Series load nahi hui.");
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, [id]);

  useEffect(() => {
    if (!series) return;

    const fetchEpisodes = async () => {
      try {
        setEpisodeLoading(true);

        const res = await api.get(
          `/episodes/series/${id}/season/${season}`
        );

        const data = res.data.episodes || res.data;
        setEpisodes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setEpisodes([]);
      } finally {
        setEpisodeLoading(false);
      }
    };

    fetchEpisodes();
  }, [id, season, series]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#080808] flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-red-600
              border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-5 text-gray-400">
              Loading your series...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error || !series) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#080808] flex items-center justify-center text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              Series Not Found
            </h2>
            <p className="text-gray-400 mb-6">
              {error || "Series not found"}
            </p>
            <Link
              to="/series"
              className="inline-flex items-center gap-2 bg-red-600
                px-6 py-3 rounded-xl hover:bg-red-700"
            >
              <ArrowLeft size={18} />
              Back to Series
            </Link>
          </div>
        </div>
      </>
    );
  }

  const totalSeasons = Math.max(
    1,
    Number(series.totalSeasons || 1)
  );

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-[#080808] text-white">

        {/* HERO SECTION */}
        <section className="relative overflow-hidden">

          {/* Background Poster */}
          <div className="absolute inset-0">
            <img
              src={series.poster}
              alt=""
              className="w-full h-full object-cover object-center
                scale-110 blur-sm opacity-30"
            />

            <div className="absolute inset-0 bg-linear-to-r
              from-[#080808] via-[#080808]/90 to-[#080808]/40" />

            <div className="absolute inset-0 bg-linear-to-t
              from-[#080808] via-transparent to-[#080808]/50" />
          </div>

          <div className="relative max-w-7xl mx-auto px-5
            py-14 md:py-24">

            {/* Back Button */}
            <Link
              to="/series"
              className="inline-flex items-center gap-2 text-gray-300
                hover:text-white mb-10 transition"
            >
              <ArrowLeft size={18} />
              Back to Series
            </Link>

            <div className="grid gap-10 md:grid-cols-[300px_1fr]
              lg:grid-cols-[350px_1fr] items-center">

              {/* Poster */}
              <div className="relative group">
                <img
                  src={series.poster}
                  alt={series.title}
                  className="w-full max-w-87.5 mx-auto
                    aspect-2/3 object-cover rounded-2xl
                    shadow-2xl shadow-black/60
                    border border-white/10
                    transition duration-500
                    group-hover:scale-[1.02]"
                />

                <div className="absolute bottom-4 left-4
                  bg-red-600 px-3 py-1 rounded-full
                  text-xs font-bold uppercase tracking-wider">
                  Web Series
                </div>
              </div>

              {/* Series Information */}
              <div>

                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-red-500" />
                  <span className="text-red-500 font-semibold
                    uppercase tracking-[0.2em] text-sm">
                    MovieFlex Original
                  </span>
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl
                  font-black tracking-tight mb-6">
                  {series.title}
                </h1>

                <div className="flex flex-wrap items-center
                  gap-4 text-sm text-gray-300 mb-6">

                  <span className="flex items-center gap-2">
                    <Tv size={17} className="text-red-500" />
                    {totalSeasons} Season{totalSeasons > 1 ? "s" : ""}
                  </span>

                  <span className="text-gray-600">•</span>

                  <span>HD Streaming</span>

                  <span className="text-gray-600">•</span>

                  <span>TV Series</span>
                </div>

                <p className="text-gray-300 text-base md:text-lg
                  leading-8 max-w-2xl mb-8">
                  {series.description ||
                    "Discover this amazing series on MovieFlex."}
                </p>

                {/* Genres */}
                {Array.isArray(series.genres) &&
                  series.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {series.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-4 py-2 rounded-full
                            border border-white/10
                            bg-white/5 text-gray-300
                            text-sm hover:bg-white/10 transition"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                {/* Play Button */}
                {episodes.length > 0 && (
                  <Link
                    to={`/watch/episode/${episodes[0]._id}`}
                    className="inline-flex items-center gap-3
                      bg-red-600 hover:bg-red-700
                      px-8 py-4 rounded-xl
                      font-bold text-lg
                      shadow-lg shadow-red-600/20
                      transition-all duration-300
                      hover:scale-105"
                  >
                    <Play size={22} fill="currentColor" />
                    Watch Now
                  </Link>
                )}

              </div>
            </div>
          </div>
        </section>

        {/* EPISODES SECTION */}
        <section className="max-w-7xl mx-auto px-5 pb-20">

          {/* Heading */}
          <div className="flex flex-col sm:flex-row
            sm:items-center justify-between gap-5 mb-10">

            <div>
              <div className="flex items-center gap-2
                text-red-500 text-sm font-semibold
                uppercase tracking-widest mb-3">
                <PlayCircle size={18} />
                Watch Collection
              </div>

              <h2 className="text-3xl md:text-4xl font-black">
                Episodes
              </h2>

              <p className="text-gray-400 mt-2">
                Enjoy every episode of {series.title}
              </p>
            </div>

            {/* Season Selector */}
            <div className="relative">
              <select
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="appearance-none cursor-pointer
                  bg-[#151515] border border-white/10
                  hover:border-red-500/50
                  px-5 py-4 pr-12 rounded-xl
                  text-white font-semibold
                  outline-none transition
                  focus:border-red-500"
              >
                {Array.from(
                  { length: totalSeasons },
                  (_, index) => index + 1
                ).map((number) => (
                  <option key={number} value={number}>
                    Season {number}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                className="absolute right-4 top-1/2
                  -translate-y-1/2 pointer-events-none
                  text-gray-400"
              />
            </div>
          </div>

          {/* Episode Loading */}
          {episodeLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2
              lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse bg-[#151515]
                    rounded-2xl overflow-hidden"
                >
                  <div className="h-52 bg-gray-800" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-gray-800 rounded w-3/4" />
                    <div className="h-4 bg-gray-800 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : episodes.length === 0 ? (

            /* Empty State */
            <div className="rounded-3xl border border-white/10
              bg-[#121212] p-12 text-center">

              <div className="w-20 h-20 mx-auto rounded-full
                bg-white/5 flex items-center justify-center mb-6">
                <Tv size={36} className="text-gray-500" />
              </div>

              <h3 className="text-2xl font-bold mb-3">
                No Episodes Available
              </h3>

              <p className="text-gray-400">
                Season {season} mein abhi episodes available nahi hain.
              </p>
            </div>

          ) : (

            /* Episode Cards */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

              {episodes.map((episode, index) => {

                const saved = Number(
                  localStorage.getItem(
                    `episode-progress-${episode._id}`
                  ) || 0
                );

                return (
                  <Link
                    key={episode._id}
                    to={`/watch/episode/${episode._id}`}
                    className="group overflow-hidden rounded-2xl
                      bg-[#151515] border border-white/5
                      hover:border-red-500/40
                      transition-all duration-300
                      hover:-translate-y-1
                      hover:shadow-xl hover:shadow-red-900/10"
                  >

                    {/* Thumbnail */}
                    <div className="relative overflow-hidden">

                      <img
                        src={episode.thumbnail || series.poster}
                        alt={episode.title}
                        className="h-56 w-full object-cover
                          transition duration-500
                          group-hover:scale-110"
                      />

                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-linear-to-t
                        from-black/80 via-transparent to-black/20" />

                      {/* Episode Number */}
                      <div className="absolute top-4 left-4
                        bg-black/70 backdrop-blur-md
                        border border-white/10
                        px-3 py-1 rounded-lg
                        text-xs font-bold">
                        EPISODE {episode.episodeNumber || index + 1}
                      </div>

                      {/* Resume */}
                      {saved > 0 && (
                        <div className="absolute top-4 right-4
                          flex items-center gap-1
                          bg-green-600/90 px-2.5 py-1
                          rounded-lg text-xs font-semibold">
                          <CheckCircle size={13} />
                          Resume
                        </div>
                      )}

                      {/* Play Icon */}
                      <div className="absolute inset-0 flex
                        items-center justify-center">
                        <div className="w-16 h-16 rounded-full
                          bg-red-600/90 backdrop-blur-sm
                          flex items-center justify-center
                          opacity-0 scale-75
                          group-hover:opacity-100
                          group-hover:scale-100
                          transition-all duration-300
                          shadow-xl shadow-red-600/30">
                          <Play size={26} fill="white" />
                        </div>
                      </div>

                      {/* Duration */}
                      {episode.duration && (
                        <div className="absolute bottom-4 right-4
                          flex items-center gap-1
                          bg-black/70 px-2 py-1 rounded-md
                          text-xs text-gray-200">
                          <Clock size={13} />
                          {episode.duration} min
                        </div>
                      )}

                    </div>

                    {/* Episode Content */}
                    <div className="p-5">

                      <h3 className="text-lg font-bold mb-3
                        group-hover:text-red-500
                        transition-colors line-clamp-1">
                        {episode.title}
                      </h3>

                      <p className="text-sm text-gray-400
                        leading-6 line-clamp-2 mb-5">
                        {episode.description ||
                          "Watch this episode on MovieFlex."}
                      </p>

                      <div className="flex items-center
                        justify-between pt-4
                        border-t border-white/5">

                        <span className="text-sm font-semibold
                          text-red-500 flex items-center gap-2">
                          <Play size={15} fill="currentColor" />
                          Watch Episode
                        </span>

                        <span className="text-xs text-gray-500">
                          S{season} • E{episode.episodeNumber}
                        </span>
                      </div>

                    </div>

                  </Link>
                );
              })}

            </div>
          )}

        </section>

      </div>
    </>
  );
};

export default SeriesDetails;
