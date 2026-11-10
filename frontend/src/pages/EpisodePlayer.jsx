
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Download,
  Clock,
  CheckCircle,
  Tv,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  Film,
} from "lucide-react";

import api from "../services/api";
import Navbar from "../components/Navbar";

const EpisodePlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [episode, setEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedTime, setSavedTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoError, setVideoError] = useState("");

  const progressKey = `episode-progress-${id}`;

  // LOAD EPISODE
  useEffect(() => {
    let active = true;

    const fetchEpisode = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/episodes/${id}`);
        const data = res.data.episode || res.data;

        if (!active) return;

        setEpisode(data);
        setVideoError("");

        const saved = Number(
          localStorage.getItem(`episode-progress-${id}`) || 0
        );

        setSavedTime(saved);

        const seriesId = data.series?._id || data.series;

        const listRes = await api.get(
          `/episodes/series/${seriesId}/season/${data.seasonNumber}`
        );

        const list = listRes.data.episodes || listRes.data;

        if (active) {
          setEpisodes(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        console.error("Episode error:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEpisode();

    return () => {
      active = false;
    };
  }, [id]);

  // RESUME VIDEO
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration || 0);

    const saved = Number(
      localStorage.getItem(`episode-progress-${id}`) || 0
    );

    setSavedTime(saved);

    if (saved > 0 && saved < video.duration) {
      video.currentTime = saved;
    }
  };

  // SAVE PROGRESS
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;

    localStorage.setItem(progressKey, String(current));
    setSavedTime(current);
  };

  // VIDEO COMPLETE
  const handleEnded = () => {
    localStorage.removeItem(progressKey);
    setSavedTime(0);

    const index = episodes.findIndex(
      (item) => item._id === episode._id
    );

    if (index >= 0 && index < episodes.length - 1) {
      navigate(`/watch/episode/${episodes[index + 1]._id}`);
    }
  };

  // LOADING UI
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#080808] p-6">
          <div className="mx-auto max-w-7xl animate-pulse">
            <div className="mb-6 h-5 w-40 rounded bg-zinc-800" />
            <div className="aspect-video rounded-2xl bg-zinc-900" />
            <div className="mt-8 h-8 w-1/2 rounded bg-zinc-800" />
            <div className="mt-4 h-4 w-3/4 rounded bg-zinc-800" />
          </div>
        </div>
      </>
    );
  }

  // NOT FOUND
  if (!episode) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-5 text-white">
          <Film size={60} className="text-zinc-700" />
          <h1 className="mt-5 text-2xl font-bold">
            Episode Not Found
          </h1>
          <p className="mt-2 text-zinc-500">
            This episode may have been removed.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-semibold hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </>
    );
  }

  const currentIndex = episodes.findIndex(
    (item) => item._id === episode._id
  );

  const previousEpisode =
    currentIndex > 0 ? episodes[currentIndex - 1] : null;

  const nextEpisode =
    currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;

  const progressPercent =
    duration > 0
      ? Math.min((savedTime / duration) * 100, 100)
      : 0;

  // B2 URLs are already absolute. Do not rewrite them to the backend host.
  const videoUrl = episode.videoUrl || "";

  const formatTime = (seconds) => {
    if (!seconds || !Number.isFinite(seconds)) return "00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* TOP NAVIGATION */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            to={`/series/${episode.series?._id || episode.series}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Series
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-xs text-zinc-400">
            <Tv size={15} className="text-red-500" />
            <span>MovieFlex Player</span>
          </div>
        </div>

        {/* VIDEO PLAYER */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="aspect-video w-full bg-black"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setVideoError("Video load nahi ho paya. Signed URL expire ho sakta hai ya B2 file key galat hai. Page refresh karke dobara try karein.")}
          />
          {videoError && (
            <div className="border-t border-red-500/20 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {videoError}
            </div>
          )}
          {!videoUrl && (
            <div className="border-t border-yellow-500/20 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-200">
              Is episode ke saath video file attach nahi hai.
            </div>
          )}

          {/* PLAYER BOTTOM LABEL */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-zinc-950 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Now Playing
            </div>

            <div className="text-xs text-zinc-500">
              {formatTime(savedTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mt-5 rounded-xl border border-white/5 bg-white/2 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-zinc-300">
              <Clock size={16} className="text-red-500" />
              Watch Progress
            </span>
            <span className="font-semibold text-red-500">
              {Math.floor(progressPercent)}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-red-600 to-red-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* EPISODE DETAILS + SIDEBAR */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">

          {/* LEFT CONTENT */}
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-red-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500">
                Season {episode.seasonNumber}
              </span>

              <span className="text-sm text-zinc-500">
                Episode {episode.episodeNumber}
              </span>

              {episode.duration && (
                <span className="flex items-center gap-1 text-sm text-zinc-500">
                  <Clock size={14} />
                  {episode.duration}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black leading-tight sm:text-4xl">
              {episode.title}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              {episode.description || "Enjoy watching this episode on MovieFlex."}
            </p>

            {/* EPISODE NAVIGATION */}
            <div className="mt-8 flex flex-wrap items-center gap-3">

              {previousEpisode ? (
                <Link
                  to={`/watch/episode/${previousEpisode._id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  <ChevronLeft size={18} />
                  Previous
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm text-zinc-600"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
              )}

              {nextEpisode ? (
                <Link
                  to={`/watch/episode/${nextEpisode._id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-700"
                >
                  Next Episode
                  <ChevronRight size={18} />
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm text-zinc-600"
                >
                  Next Episode
                  <ChevronRight size={18} />
                </button>
              )}

              {episode.downloadUrl && (
                <a
                  href={episode.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-green-500/40 hover:text-green-400"
                >
                  <Download size={17} />
                  Download
                </a>
              )}
            </div>
          </section>

          {/* RIGHT SIDEBAR */}
          <aside className="h-fit overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50">

            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <ListVideo size={18} className="text-red-500" />
                <h2 className="font-bold">Episodes</h2>
              </div>

              <span className="text-xs text-zinc-500">
                {episodes.length} Episodes
              </span>
            </div>

            <div className="max-h-125 space-y-2 overflow-y-auto p-3">
              {episodes.length > 0 ? (
                episodes.map((item, index) => {
                  const isCurrent = item._id === episode._id;

                  const watchedTime = Number(
                    localStorage.getItem(`episode-progress-${item._id}`) || 0
                  );

                  return (
                    <Link
                      key={item._id}
                      to={`/watch/episode/${item._id}`}
                      className={`group flex gap-3 rounded-xl p-3 transition ${
                        isCurrent
                          ? "border border-red-500/20 bg-red-600/10"
                          : "border border-transparent hover:bg-white/4"
                      }`}
                    >
                      <div className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Film size={22} className="text-zinc-600" />
                        )}

                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                          <Play size={20} fill="white" />
                        </div>

                        {watchedTime > 0 && (
                          <div className="absolute bottom-0 left-0 h-1 w-full bg-zinc-700">
                            <div className="h-full w-1/3 bg-red-500" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                          EP {String(index + 1).padStart(2, "0")}
                          {isCurrent && (
                            <span className="text-red-500">• Playing</span>
                          )}
                        </div>

                        <h3 className={`line-clamp-2 text-sm font-semibold ${
                          isCurrent ? "text-red-400" : "text-zinc-200"
                        }`}>
                          {item.title}
                        </h3>

                        {item.duration && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {item.duration}
                          </p>
                        )}
                      </div>

                      {isCurrent && (
                        <CheckCircle
                          size={16}
                          className="mt-1 shrink-0 text-red-500"
                        />
                      )}
                    </Link>
                  );
                })
              ) : (
                <p className="p-5 text-center text-sm text-zinc-500">
                  No episodes available.
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-white/5 py-6 text-center text-xs text-zinc-600">
        MovieFlex • Premium Streaming Experience
      </footer>
    </div>
  );
};

export default EpisodePlayer;
