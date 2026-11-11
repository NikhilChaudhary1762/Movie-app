
import { useCallback, useEffect, useState } from "react";
import {
  Tv,
  Film,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Upload,
  Image as ImageIcon,
  Loader2,
  Play,
  CheckCircle,
  AlertCircle,
  Edit3,
  X,
  Save,
} from "lucide-react";

import api from "../services/api";
import { uploadVideoChunks } from "../services/chunkUpload";

const initialSeries = {
  title: "",
  description: "",
  poster: "",
  genres: "",
  totalSeasons: 1,
};

const initialEpisode = {
  title: "",
  description: "",
  seasonNumber: 1,
  episodeNumber: 1,
  duration: "",
  thumbnail: "",
  videoUrl: "",
  downloadUrl: "",
};

const input =
  "w-full rounded-xl border border-white/10 bg-[#0b0d12] px-4 py-3 text-sm text-white outline-none focus:border-red-500";

const button =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50";

export default function AdminSeries() {
  const [series, setSeries] = useState([]);
  const [episodes, setEpisodes] = useState([]);

  const [selectedId, setSelectedId] = useState("");

  const [seriesForm, setSeriesForm] = useState(initialSeries);
  const [episodeForm, setEpisodeForm] = useState(initialEpisode);

  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  const [notice, setNotice] = useState(null);

  const notify = (message, type = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  // LOAD SERIES AND EPISODES
  const loadData = useCallback(async () => {
    await Promise.resolve();

    try {
      setLoading(true);

      const [seriesRes, episodeRes] = await Promise.all([
        api.get("/series"),
        api.get("/episodes"),
      ]);

      const seriesData =
        seriesRes.data.series ||
        seriesRes.data.data ||
        seriesRes.data;

      const episodeData =
        episodeRes.data.episodes ||
        episodeRes.data.data ||
        episodeRes.data;

      setSeries(Array.isArray(seriesData) ? seriesData : []);
      setEpisodes(Array.isArray(episodeData) ? episodeData : []);
    } catch (error) {
      console.error(error);
      notify("Data load nahi hua", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        return loadData();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const selectedSeries = series.find(
    (item) => item._id === selectedId
  );

  const selectedEpisodes = episodes.filter((episode) => {
    const episodeSeriesId =
      episode.series?._id || episode.series;

    return String(episodeSeriesId) === String(selectedId);
  });

  const filteredSeries = series.filter((item) =>
    item.title?.toLowerCase().includes(search.toLowerCase())
  );

  // UPLOAD IMAGE
  const uploadImage = async (file, type) => {
    if (!file) return;

    try {
      setUploading(type);

      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/upload", formData);

      const imageUrl =
        response.data.url ||
        response.data.fileUrl ||
        response.data.path;

      if (!imageUrl) {
        throw new Error("Upload URL missing");
      }

      if (type === "poster") {
        setSeriesForm((prev) => ({
          ...prev,
          poster: imageUrl,
        }));
      } else {
        setEpisodeForm((prev) => ({
          ...prev,
          thumbnail: imageUrl,
        }));
      }

      notify("Image upload successful");
    } catch (error) {
      console.error(error);
      notify("Image upload failed", "error");
    } finally {
      setUploading("");
    }
  };

  // CREATE / UPDATE SERIES
  const saveSeries = async (e) => {
    e.preventDefault();

    if (!seriesForm.title.trim()) {
      notify("Series title required", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: seriesForm.title,
        description: seriesForm.description,
        poster: seriesForm.poster,
        genres: seriesForm.genres
          .split(",")
          .map((genre) => genre.trim())
          .filter(Boolean),
        totalSeasons: Number(seriesForm.totalSeasons),
      };

      if (editingSeriesId) {
        await api.put(`/series/${editingSeriesId}`, payload);
        notify("Series successfully updated");
      } else {
        await api.post("/series", payload);
        notify("Series created successfully");
      }

      setSeriesForm(initialSeries);
      setEditingSeriesId(null);

      await loadData();
    } catch (error) {
      console.error(error);
      notify("Series save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // EDIT SERIES
  const editSeries = (item) => {
    setEditingSeriesId(item._id);

    setSeriesForm({
      title: item.title || "",
      description: item.description || "",
      poster: item.poster || "",
      genres: (item.genres || []).join(", "),
      totalSeasons: item.totalSeasons || 1,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelSeriesEdit = () => {
    setEditingSeriesId(null);
    setSeriesForm(initialSeries);
  };

  // DELETE SERIES
  const deleteSeries = async (id) => {
    if (!window.confirm("Delete this series?")) return;

    try {
      await api.delete(`/series/${id}`);

      if (selectedId === id) {
        setSelectedId("");
      }

      if (editingSeriesId === id) {
        cancelSeriesEdit();
      }

      notify("Series deleted");
      await loadData();
    } catch (error) {
      console.error(error);
      notify("Series delete failed", "error");
    }
  };

  // ADD SEASON
  const addSeason = async () => {
    if (!selectedSeries) return;

    try {
      await api.put(`/series/${selectedId}`, {
        totalSeasons:
          Number(selectedSeries.totalSeasons || 1) + 1,
      });

      notify("New season added");
      await loadData();
    } catch (error) {
      console.error(error);
      notify("Season add failed", "error");
    }
  };

  // CREATE / UPDATE EPISODE
  const saveEpisode = async (e) => {
    e.preventDefault();

    if (!selectedId) {
      notify("Please select a series", "error");
      return;
    }

    if (!episodeForm.title.trim()) {
      notify("Episode title required", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        series: selectedId,
        title: episodeForm.title,
        description: episodeForm.description,
        seasonNumber: Number(episodeForm.seasonNumber),
        episodeNumber: Number(episodeForm.episodeNumber),
        duration: episodeForm.duration,
        thumbnail: episodeForm.thumbnail,
        videoUrl: episodeForm.videoUrl,
        downloadUrl: episodeForm.downloadUrl,
      };

      if (editingEpisodeId) {
        await api.put(`/episodes/${editingEpisodeId}`, payload);
        notify("Episode successfully updated");
      } else {
        await api.post("/episodes", payload);
        notify("Episode added successfully");
      }

      setEpisodeForm(initialEpisode);
      setEditingEpisodeId(null);

      await loadData();
    } catch (error) {
      console.error(error);
      notify("Episode save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // EDIT EPISODE
  const editEpisode = (episode) => {
    setEditingEpisodeId(episode._id);

    const episodeSeriesId =
      episode.series?._id || episode.series;

    setSelectedId(String(episodeSeriesId || ""));

    setEpisodeForm({
      title: episode.title || "",
      description: episode.description || "",
      seasonNumber: episode.seasonNumber || 1,
      episodeNumber: episode.episodeNumber || 1,
      duration: episode.duration || "",
      thumbnail: episode.thumbnail || "",
      videoUrl: episode.videoUrl || "",
      downloadUrl: episode.downloadUrl || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelEpisodeEdit = () => {
    setEditingEpisodeId(null);
    setEpisodeForm(initialEpisode);
  };

  // DELETE EPISODE
  const deleteEpisode = async (id) => {
    if (!window.confirm("Delete this episode?")) return;

    try {
      await api.delete(`/episodes/${id}`);

      if (editingEpisodeId === id) {
        cancelEpisodeEdit();
      }

      notify("Episode deleted");
      await loadData();
    } catch (error) {
      console.error(error);
      notify("Episode delete failed", "error");
    }
  };

  // EPISODE VIDEO UPLOAD - MP4 ONLY
  const uploadEpisodeVideo = async (e) => {
    const file = e.target.files?.[0];

    // Allow selecting the same file again for resume.
    e.target.value = "";

    if (!file) return;

    const isMp4 =
      file.name.toLowerCase().endsWith(".mp4") &&
      (!file.type || file.type === "video/mp4");

    if (!isMp4) {
      setUploadProgress(0);
      setUploadMessage(
        "Invalid video format. Only converted MP4 videos are allowed."
      );
      notify(
        "Please convert the video using prepare-video.ps1 first.",
        "error"
      );
      return;
    }

    try {
      setUploading("episode-video");
      setUploadProgress(0);
      setUploadMessage("Starting B2 MP4 upload...");

      notify(`Selected: ${file.name}`);

      const result = await uploadVideoChunks(file, {
        onProgress: (p) => setUploadProgress(p),
        onMessage: (m) => setUploadMessage(m),
      });

      const uploadedVideoUrl =
        result.videoUrl || result.watchUrl;

      if (!uploadedVideoUrl) {
        throw new Error(
          "Upload completed but video URL was not returned."
        );
      }

      setEpisodeForm((prev) => ({
        ...prev,
        videoUrl: uploadedVideoUrl,
        downloadUrl:
          result.downloadUrl || prev.downloadUrl,
      }));

      setUploadProgress(100);
      setUploadMessage("Upload completed successfully!");

      notify("Episode video uploaded successfully");
    } catch (error) {
      console.error("Episode Upload Error:", error);

      setUploadMessage(
        error.response?.data?.message ||
          error.message ||
          "Episode upload failed. Select the same file again to resume."
      );

      notify(
        error.response?.data?.message ||
          error.message ||
          "Episode upload failed",
        "error"
      );
    } finally {
      setUploading("");
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              MovieFlex Studio
            </p>

            <h1 className="text-3xl font-bold md:text-4xl">
              Series & Episodes
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Manage your webseries, seasons and episodes.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className={`${button} border border-white/10 bg-white/5 hover:bg-white/10`}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* NOTIFICATION */}
        {notice && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              notice.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-green-500/30 bg-green-500/10 text-green-300"
            }`}
          >
            {notice.type === "error" ? (
              <AlertCircle size={18} />
            ) : (
              <CheckCircle size={18} />
            )}

            {notice.message}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Tv size={22} />}
            title="Total Series"
            value={series.length}
          />

          <StatCard
            icon={<Layers size={22} />}
            title="Total Seasons"
            value={series.reduce(
              (total, item) =>
                total + Number(item.totalSeasons || 1),
              0
            )}
          />

          <StatCard
            icon={<Film size={22} />}
            title="Total Episodes"
            value={episodes.length}
          />
        </div>

        {/* SERIES FORM */}
        <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5 md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
              {editingSeriesId ? (
                <Edit3 size={22} />
              ) : (
                <Plus size={22} />
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold">
                {editingSeriesId ? "Edit Series" : "Create New Series"}
              </h2>

              <p className="text-sm text-gray-400">
                {editingSeriesId
                  ? "Update existing series details"
                  : "Add a new webseries to MovieFlex"}
              </p>
            </div>
          </div>

          <form onSubmit={saveSeries} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Series Title">
                <input
                  className={input}
                  placeholder="Enter series title"
                  value={seriesForm.title}
                  onChange={(e) =>
                    setSeriesForm({
                      ...seriesForm,
                      title: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Genres">
                <input
                  className={input}
                  placeholder="Drama, Comedy, Thriller"
                  value={seriesForm.genres}
                  onChange={(e) =>
                    setSeriesForm({
                      ...seriesForm,
                      genres: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Total Seasons">
                <input
                  type="number"
                  min="1"
                  className={input}
                  value={seriesForm.totalSeasons}
                  onChange={(e) =>
                    setSeriesForm({
                      ...seriesForm,
                      totalSeasons: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Poster URL">
                <div className="flex gap-2">
                  <input
                    className={input}
                    placeholder="https://example.com/poster.jpg"
                    value={seriesForm.poster}
                    onChange={(e) =>
                      setSeriesForm({
                        ...seriesForm,
                        poster: e.target.value,
                      })
                    }
                  />

                  <label className="flex cursor-pointer items-center justify-center rounded-xl bg-white/10 px-4 hover:bg-white/20">
                    {uploading === "poster" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}

                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        uploadImage(e.target.files?.[0], "poster")
                      }
                    />
                  </label>
                </div>
              </Field>
            </div>

            {seriesForm.poster && (
              <img
                src={seriesForm.poster}
                alt="Series poster"
                className="h-32 rounded-xl object-cover"
              />
            )}

            <Field label="Description">
              <textarea
                rows="3"
                className={input}
                placeholder="Write series description..."
                value={seriesForm.description}
                onChange={(e) =>
                  setSeriesForm({
                    ...seriesForm,
                    description: e.target.value,
                  })
                }
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <button
                disabled={saving}
                className={`${button} bg-red-600 text-white hover:bg-red-700`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editingSeriesId ? (
                  <Save size={16} />
                ) : (
                  <Plus size={16} />
                )}

                {editingSeriesId
                  ? "Save Series Changes"
                  : "Create Series"}
              </button>

              {editingSeriesId && (
                <button
                  type="button"
                  onClick={cancelSeriesEdit}
                  className={`${button} bg-white/10 hover:bg-white/20`}
                >
                  <X size={16} />
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* SERIES LIBRARY */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">
              Series Library
            </h2>

            <div className="relative w-full md:w-72">
              <Search
                size={17}
                className="absolute left-3 top-3.5 text-gray-500"
              />

              <input
                className={`${input} pl-10`}
                placeholder="Search series..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-red-500" size={32} />
            </div>
          ) : filteredSeries.length === 0 ? (
            <EmptyState text="No series found" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSeries.map((item) => (
                <div
                  key={item._id}
                  className={`overflow-hidden rounded-2xl border bg-[#11141c] transition ${
                    selectedId === item._id
                      ? "border-red-500"
                      : "border-white/10"
                  }`}
                >
                  <div className="relative h-48 bg-black/30">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-600">
                        <ImageIcon size={40} />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-semibold">{item.title}</h3>

                      <p className="text-xs text-gray-300">
                        {item.totalSeasons || 1} Seasons
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <p className="line-clamp-2 min-h-8 text-xs text-gray-400">
                      {(item.genres || []).join(" • ")}
                    </p>

                    <button
                      onClick={() => setSelectedId(item._id)}
                      className={`${button} w-full ${
                        selectedId === item._id
                          ? "bg-red-600"
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      <Play size={15} />
                      {selectedId === item._id
                        ? "Selected"
                        : "Manage Episodes"}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => editSeries(item)}
                        className={`${button} flex-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20`}
                      >
                        <Edit3 size={15} />
                        Edit
                      </button>

                      <button
                        onClick={() => deleteSeries(item._id)}
                        className={`${button} bg-red-500/10 text-red-400 hover:bg-red-500/20`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEASON MANAGEMENT */}
        <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <Layers className="text-red-400" size={22} />

            <h2 className="text-xl font-semibold">
              Season Management
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className={`${input} flex-1`}
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                cancelEpisodeEdit();
              }}
            >
              <option value="">Select Series</option>

              {series.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedId}
              onClick={addSeason}
              className={`${button} bg-red-600 hover:bg-red-700`}
            >
              <Plus size={16} />
              Add Season
            </button>
          </div>

          {selectedSeries && (
            <p className="mt-4 text-sm text-gray-400">
              Selected:{" "}
              <span className="text-white">{selectedSeries.title}</span>
              {" "}• Total Seasons:{" "}
              <span className="text-white">
                {selectedSeries.totalSeasons || 1}
              </span>
            </p>
          )}
        </section>

        {/* EPISODE FORM */}
        <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5 md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
              {editingEpisodeId ? (
                <Edit3 size={22} />
              ) : (
                <Film size={22} />
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold">
                {editingEpisodeId ? "Edit Episode" : "Add New Episode"}
              </h2>

              <p className="text-sm text-gray-400">
                {selectedSeries
                  ? `Series: ${selectedSeries.title}`
                  : "Select a series first"}
              </p>
            </div>
          </div>

          <form onSubmit={saveEpisode} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Episode Title">
                <input
                  className={input}
                  placeholder="Episode title"
                  value={episodeForm.title}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      title: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Season Number">
                <input
                  type="number"
                  min="1"
                  className={input}
                  value={episodeForm.seasonNumber}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      seasonNumber: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Episode Number">
                <input
                  type="number"
                  min="1"
                  className={input}
                  value={episodeForm.episodeNumber}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      episodeNumber: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Duration">
                <input
                  className={input}
                  placeholder="25 min"
                  value={episodeForm.duration}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      duration: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Thumbnail URL">
                <div className="flex gap-2">
                  <input
                    className={input}
                    placeholder="Thumbnail URL"
                    value={episodeForm.thumbnail}
                    onChange={(e) =>
                      setEpisodeForm({
                        ...episodeForm,
                        thumbnail: e.target.value,
                      })
                    }
                  />

                  <label className="flex cursor-pointer items-center justify-center rounded-xl bg-white/10 px-4 hover:bg-white/20">
                    {uploading === "thumbnail" ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}

                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        uploadImage(e.target.files?.[0], "thumbnail")
                      }
                    />
                  </label>
                </div>
              </Field>

              {/* EPISODE VIDEO UPLOAD */}
              <Field label="Upload Episode Video (MP4 • B2 Chunk/Resume)">
                <div className="space-y-3">
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                    <p className="text-sm font-medium text-green-400">
                      Required video format
                    </p>

                    <p className="mt-1 text-xs text-gray-300">
                      MP4 container • H.264 video • yuv420p • AAC audio
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      First convert your video on your Windows PC using
                      prepare-video.ps1. Then select the converted MP4 file.
                    </p>
                  </div>

                  <label
                    htmlFor="episodeVideoInput"
                    className={`${button} w-full cursor-pointer bg-red-600 hover:bg-red-700`}
                  >
                    <Upload size={16} />
                    Select Converted MP4 Video
                  </label>

                  <input
                    id="episodeVideoInput"
                    type="file"
                    className="hidden"
                    accept=".mp4,video/mp4"
                    disabled={uploading === "episode-video"}
                    onChange={uploadEpisodeVideo}
                  />

                  <p className="text-xs text-gray-400">
                    8 MB chunks • Retry • Resume by selecting the exact
                    same file again.
                  </p>

                  {uploading === "episode-video" && (
                    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-yellow-400">
                          Uploading MP4 video...
                        </span>

                        <span className="text-lg font-bold tabular-nums text-white">
                          {uploadProgress}%
                        </span>
                      </div>

                      <div
                        className="h-3 w-full overflow-hidden rounded-full bg-white/10"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={uploadProgress}
                      >
                        <div
                          className="h-full rounded-full bg-red-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      <p className="text-xs text-gray-400 wrap-break-word">
                        {uploadMessage || "Preparing upload..."}
                      </p>
                    </div>
                  )}

                  {uploading !== "episode-video" && uploadMessage && (
                    <p className="text-xs text-gray-400">
                      {uploadMessage}
                    </p>
                  )}

                  {episodeForm.videoUrl && (
                    <p className="text-xs text-green-400">
                      <CheckCircle size={14} className="mr-1 inline" />
                      Episode video URL is ready.
                    </p>
                  )}
                </div>
              </Field>

              <Field label="Video URL (or paste manually)">
                <input
                  className={input}
                  placeholder="b2://videos/... (filled automatically after upload)"
                  value={episodeForm.videoUrl}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      videoUrl: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Download URL">
                <input
                  className={input}
                  placeholder="Download link"
                  value={episodeForm.downloadUrl}
                  onChange={(e) =>
                    setEpisodeForm({
                      ...episodeForm,
                      downloadUrl: e.target.value,
                    })
                  }
                />
              </Field>
            </div>

            {episodeForm.thumbnail && (
              <img
                src={episodeForm.thumbnail}
                alt="Episode thumbnail"
                className="h-32 rounded-xl object-cover"
              />
            )}

            <Field label="Episode Description">
              <textarea
                rows="3"
                className={input}
                placeholder="Episode description..."
                value={episodeForm.description}
                onChange={(e) =>
                  setEpisodeForm({
                    ...episodeForm,
                    description: e.target.value,
                  })
                }
              />
            </Field>

            <div className="flex flex-wrap gap-3">
              <button
                disabled={saving || !selectedId || uploading === "episode-video"}
                className={`${button} bg-red-600 hover:bg-red-700`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editingEpisodeId ? (
                  <Save size={16} />
                ) : (
                  <Plus size={16} />
                )}

                {editingEpisodeId
                  ? "Save Episode Changes"
                  : "Add Episode"}
              </button>

              {editingEpisodeId && (
                <button
                  type="button"
                  onClick={cancelEpisodeEdit}
                  className={`${button} bg-white/10 hover:bg-white/20`}
                >
                  <X size={16} />
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* EPISODE LIST */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Episodes
            </h2>

            <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-400">
              {selectedEpisodes.length} Episodes
            </span>
          </div>

          {!selectedId ? (
            <EmptyState text="Select a series to view episodes" />
          ) : selectedEpisodes.length === 0 ? (
            <EmptyState text="No episodes available for this series" />
          ) : (
            <div className="space-y-3">
              {selectedEpisodes.map((episode) => (
                <div
                  key={episode._id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#11141c] p-4 md:flex-row md:items-center"
                >
                  <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl bg-black/30 md:w-32">
                    {episode.thumbnail ? (
                      <img
                        src={episode.thumbnail}
                        alt={episode.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-600">
                        <Film size={25} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                      S{episode.seasonNumber} E{episode.episodeNumber} -{" "}
                      {episode.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                      {episode.description || "No description"}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Duration: {episode.duration || "N/A"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editEpisode(episode)}
                      className={`${button} bg-blue-500/10 text-blue-400 hover:bg-blue-500/20`}
                    >
                      <Edit3 size={15} />
                      Edit
                    </button>

                    <button
                      onClick={() => deleteEpisode(episode._id)}
                      className={`${button} bg-red-500/10 text-red-400 hover:bg-red-500/20`}
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// REUSABLE COMPONENTS

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">
        {label}
      </label>

      {children}
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">{title}</span>
        <span className="text-red-400">{icon}</span>
      </div>

      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-[#11141c] py-12 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}
