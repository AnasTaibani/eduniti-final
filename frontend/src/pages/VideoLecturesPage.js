import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Video, Loader2, Download, Play, ChevronRight, ChevronLeft, Presentation, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const SlideshowViewer = ({ slides, topic }) => {
  const [current, setCurrent] = useState(0);
  if (!slides || slides.length === 0) return null;
  const slide = slides[current];

  return (
    <div className="space-y-4" data-testid="slideshow-viewer">
      <div className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-2xl p-8 min-h-[320px] flex flex-col justify-center text-white shadow-xl">
        <div className="absolute top-4 right-4 text-xs text-white/50">{current + 1} / {slides.length}</div>
        <h2 className="text-2xl font-bold mb-4">{slide.title}</h2>
        <p className="text-base text-white/80 leading-relaxed mb-4">{slide.content}</p>
        {slide.key_points && (
          <ul className="space-y-1.5">
            {slide.key_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 text-amber-400 flex-shrink-0" />
                {pt}
              </li>
            ))}
          </ul>
        )}
        {slide.visual_description && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-white/50 italic">{slide.visual_description}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrent(p => Math.max(0, p - 1))} disabled={current === 0} className="gap-1" data-testid="slide-prev">
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-purple-500 scale-125" : "bg-slate-200 hover:bg-slate-300"}`} />
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrent(p => Math.min(slides.length - 1, p + 1))} disabled={current === slides.length - 1} className="gap-1" data-testid="slide-next">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const VideoLecturesPage = () => {
  const navigate = useNavigate();
  const { student } = useAuth();
  const { t } = useI18n();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState("");
  const [newType, setNewType] = useState("slideshow");
  const [generating, setGenerating] = useState(false);
  const [viewingSlideshow, setViewingSlideshow] = useState(null);

  useEffect(() => { fetchVideos(); const interval = setInterval(fetchVideos, 5000); return () => clearInterval(interval); }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${API}/videos`);
      setVideos(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const generateNew = async (e) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append("topic", newTopic);
      formData.append("video_type", newType);
      await axios.post(`${API}/video/generate`, formData);
      toast.success(`${t("generating_video")} ${newType === "sora2" ? "(~2-5 min)" : "(~30s)"}`);
      setNewTopic("");
      fetchVideos();
    } catch (e) { toast.error("Failed"); }
    finally { setGenerating(false); }
  };

  const statusColor = (s) => s === "completed" ? "text-emerald-600 bg-emerald-50" : s === "failed" ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50";
  const statusLabel = (s) => s === "completed" ? t("video_ready") : s === "failed" ? "Failed" : t("generating_video");

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="video-lectures-page">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("dashboard")}
          </Button>
          <Video className="w-5 h-5 text-purple-500" />
          <h1 className="text-lg font-bold" style={{ color: "#0F172A" }}>{t("my_video_lectures")}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-3xl space-y-6">
        {/* Generate New */}
        <Card className="border border-purple-200 bg-purple-50/30" data-testid="generate-video-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" /> {t("generate_video_lecture")}</CardTitle>
            <CardDescription>{t("enter_topic")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateNew} className="space-y-3">
              <Input placeholder="e.g., Photosynthesis, Newton's Laws, Indian Independence..." value={newTopic} onChange={e => setNewTopic(e.target.value)} data-testid="new-video-topic" />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setNewType("slideshow")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${newType === "slideshow" ? "border-purple-500 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  data-testid="type-slideshow">
                  <div className="flex items-center gap-2 mb-1"><Presentation className="w-4 h-4 text-purple-600" /><span className="text-sm font-medium">{t("slideshow")}</span></div>
                  <p className="text-xs text-slate-400">{t("slideshow_desc")}</p>
                </button>
                <button type="button" onClick={() => setNewType("sora2")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${newType === "sora2" ? "border-purple-500 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  data-testid="type-sora2">
                  <div className="flex items-center gap-2 mb-1"><Video className="w-4 h-4 text-purple-600" /><span className="text-sm font-medium">{t("ai_video")}</span></div>
                  <p className="text-xs text-slate-400">{t("ai_video_desc")}</p>
                </button>
              </div>
              <Button type="submit" disabled={generating || !newTopic.trim()} className="w-full rounded-full bg-purple-600 hover:bg-purple-700 gap-2" data-testid="generate-btn">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {generating ? t("generating_video") : t("generate_video_lecture")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Slideshow Viewer */}
        {viewingSlideshow && (
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{viewingSlideshow.topic}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setViewingSlideshow(null)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent>
              <SlideshowViewer slides={viewingSlideshow.slides} topic={viewingSlideshow.topic} />
            </CardContent>
          </Card>
        )}

        {/* Video List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">{t("enter_topic")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map(v => (
              <Card key={v.id} className="border border-slate-200 hover:border-purple-200 transition-all" data-testid={`video-${v.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${v.video_type === "sora2" ? "bg-purple-100" : "bg-indigo-100"}`}>
                    {v.video_type === "sora2" ? <Video className="w-5 h-5 text-purple-600" /> : <Presentation className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>{v.topic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(v.status)}`}>{statusLabel(v.status)}</span>
                      <span className="text-xs text-slate-400">{v.video_type === "sora2" ? t("ai_video") : t("slideshow")}</span>
                      {v.status === "generating" && <Clock className="w-3 h-3 text-amber-500 animate-pulse" />}
                    </div>
                  </div>
                  {v.status === "completed" && v.video_type === "sora2" && v.video_path && (
                    <a href={`${API}/video/${v.id}/download`} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="gap-1 rounded-full" data-testid={`download-${v.id}`}>
                        <Download className="w-3.5 h-3.5" /> {t("download_video")}
                      </Button>
                    </a>
                  )}
                  {v.status === "completed" && v.video_type === "slideshow" && v.slides && (
                    <Button size="sm" variant="outline" onClick={() => setViewingSlideshow(v)} className="gap-1 rounded-full" data-testid={`view-slideshow-${v.id}`}>
                      <Play className="w-3.5 h-3.5" /> {t("view_slideshow")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLecturesPage;
