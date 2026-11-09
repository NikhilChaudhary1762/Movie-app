
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Tv,
  Play,
  Sparkles,
  ChevronRight,
  Film,
} from "lucide-react";

import api from "../services/api";
import Navbar from "../components/Navbar";

export default function Series() {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await api.get("/series");
        setSeries(res.data.series || []);
      } catch (error) {
        console.error("Series error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, []);

  const genres = [
    "All",
    ...new Set(series.flatMap((item) => item.genres || [])),
  ];

  const filteredSeries = series.filter((item) => {
    const matchesSearch = item.title
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchesGenre =
      selectedGenre === "All" ||
      item.genres?.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-[#080808] text-white">

        {/* HERO SECTION */}
        <section className="relative overflow-hidden">

          {/* Background */}
          <div className="absolute inset-0">
            <img
              src={series[0]?.poster}
              alt=""
              className="w-full h-full object-cover
                opacity-25 blur-sm scale-110"
            />

            <div className="absolute inset-0 bg-linear-to-r
              from-[#080808] via-[#080808]/90 to-transparent" />

            <div className="absolute inset-0 bg-linear-to-t
              from-[#080808] via-transparent to-[#080808]/40" />
          </div>

          <div className="relative max-w-7xl mx-auto
            px-5 py-20 md:py-28">

            <div className="max-w-2xl">

              <div className="flex items-center gap-2
                text-red-500 mb-5">
                <Sparkles size={18} />
                <span className="uppercase tracking-[0.25em]
                  text-sm font-semibold">
                  MovieFlex Originals
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl
                font-black tracking-tight mb-6">
                Web <span className="text-red-600">Series</span>
              </h1>

              <p className="text-gray-300 text-lg
                leading-8 mb-8 max-w-xl">
                Discover amazing stories, unforgettable characters
                and binge-worthy series. Your next favorite
                show is waiting for you.
              </p>

              <div className="flex items-center gap-3
                text-gray-400 text-sm">
                <Tv size={18} className="text-red-500" />
                <span>{series.length} Series Available</span>
                <span>•</span>
                <span>Premium Streaming</span>
              </div>

            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <main className="max-w-7xl mx-auto px-5 pb-20">

          {/* SEARCH + FILTER */}
          <div className="flex flex-col lg:flex-row
            lg:items-center justify-between gap-6 mb-10">

            <div>
              <h2 className="text-3xl font-bold mb-2">
                Explore Series
              </h2>
              <p className="text-gray-400">
                Find your next binge-worthy show
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={20}
                className="absolute left-4 top-1/2
                  -translate-y-1/2 text-gray-500"
              />

              <input
                type="text"
                placeholder="Search series..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#151515]
                  border border-white/10 rounded-xl
                  py-4 pl-12 pr-4 text-white
                  outline-none focus:border-red-500
                  transition placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* GENRE FILTER */}
          <div className="flex flex-wrap gap-3 mb-10">

            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-5 py-2.5 rounded-full
                  text-sm font-semibold transition-all
                  ${
                    selectedGenre === genre
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                      : "bg-[#151515] text-gray-400 border border-white/10 hover:text-white hover:border-white/30"
                  }`}
              >
                {genre}
              </button>
            ))}

          </div>

          {/* LOADING SKELETON */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3
              lg:grid-cols-4 xl:grid-cols-5 gap-6">

              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                <div
                  key={item}
                  className="animate-pulse"
                >
                  <div className="aspect-2/3 bg-[#1a1a1a]
                    rounded-2xl" />
                  <div className="h-4 bg-[#1a1a1a]
                    rounded mt-4 w-3/4" />
                  <div className="h-3 bg-[#1a1a1a]
                    rounded mt-3 w-1/2" />
                </div>
              ))}

            </div>
          ) : filteredSeries.length === 0 ? (

            /* EMPTY STATE */
            <div className="text-center py-24
              rounded-3xl bg-[#121212]
              border border-white/5">

              <Film size={55} className="mx-auto
                text-gray-600 mb-5" />

              <h3 className="text-2xl font-bold mb-3">
                No Series Found
              </h3>

              <p className="text-gray-400">
                Try searching with another name or genre.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setSelectedGenre("All");
                }}
                className="mt-6 text-red-500
                  hover:text-red-400 font-semibold"
              >
                Reset Filters
              </button>

            </div>

          ) : (

            /* SERIES GRID */
            <div className="grid grid-cols-2 md:grid-cols-3
              lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-7">

              {filteredSeries.map((item) => (

                <Link
                  key={item._id}
                  to={`/series/${item._id}`}
                  className="group relative"
                >

                  {/* Poster */}
                  <div className="relative overflow-hidden
                    rounded-2xl aspect-2/3
                    bg-[#151515] border border-white/5
                    group-hover:border-red-500/40
                    transition duration-300">

                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover
                        transition duration-500
                        group-hover:scale-110"
                    />

                    {/* Gradient */}
                    <div className="absolute inset-0
                      bg-linear-to-t from-black/90
                      via-transparent to-black/10
                      opacity-80" />

                    {/* Web Series Badge */}
                    <div className="absolute top-3 left-3
                      flex items-center gap-1.5
                      bg-black/60 backdrop-blur-md
                      border border-white/10
                      px-2.5 py-1 rounded-lg
                      text-xs font-semibold">
                      <Tv size={13} className="text-red-500" />
                      Series
                    </div>

                    {/* Hover Play */}
                    <div className="absolute inset-0 flex
                      items-center justify-center">
                      <div className="w-14 h-14 rounded-full
                        bg-red-600 flex items-center
                        justify-center shadow-xl
                        opacity-0 scale-75
                        group-hover:opacity-100
                        group-hover:scale-100
                        transition-all duration-300">
                        <Play size={24} fill="white" />
                      </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-0 left-0
                      right-0 p-4">

                      <h3 className="text-lg font-bold
                        text-white line-clamp-1
                        group-hover:text-red-400
                        transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-xs text-gray-300 mt-2
                        line-clamp-1">
                        {item.genres?.join(" • ") ||
                          "Entertainment"}
                      </p>

                    </div>

                  </div>

                  {/* External Details */}
                  <div className="flex items-center
                    justify-between mt-3 px-1">

                    <span className="text-xs text-gray-500">
                      {item.totalSeasons || 1} Season
                      {(item.totalSeasons || 1) > 1 ? "s" : ""}
                    </span>

                    <span className="text-red-500
                      flex items-center gap-1
                      text-xs font-semibold
                      group-hover:translate-x-1
                      transition-transform">
                      Explore
                      <ChevronRight size={15} />
                    </span>

                  </div>

                </Link>

              ))}

            </div>
          )}

        </main>

      </div>
    </>
  );
}
