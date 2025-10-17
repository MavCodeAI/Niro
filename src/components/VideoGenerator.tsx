"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, PlayCircle, History } from "lucide-react";
import { motion } from "framer-motion";

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState("");
  const [videoHistory, setVideoHistory] = useState<
    { url: string; aspect: string }[]
  >([]);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const aspectOptions = [
    { value: "16:9", label: "Landscape (16:9)" },
    { value: "9:16", label: "Mobile / Portrait (9:16)" },
    { value: "1:1", label: "Square (1:1)" },
  ];

  // Load history
  useEffect(() => {
    try {
      const saved = localStorage.getItem("videoHistory");
      if (saved) setVideoHistory(JSON.parse(saved));
    } catch {
      localStorage.removeItem("videoHistory");
    }
  }, []);

  // Save to history
  const saveToHistory = (video: { url: string; aspect: string }) => {
    setVideoHistory((prev) => {
      const newHistory = [video, ...prev].slice(0, 10);
      localStorage.setItem("videoHistory", JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Helper delay
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // Yabes API
  const generateWithYabes = async (prompt: string) => {
    const response = await fetch(
      "https://yabes-api.pages.dev/api/ai/video/v1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${prompt}, aspect ${aspectRatio}` }),
      }
    );
    const data = await response.json();
    return data.videoUrl || "";
  };

  // Pollinations (Image Fallback)
  const generateWithPollinations = async (prompt: string) => {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      `${prompt}, aspect ${aspectRatio}`
    )}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Pollinations failed");
    return url;
  };

  // HuggingFace Fallback
  const generateWithHuggingFace = async (prompt: string) => {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer hf_xxxxxxxxx", // replace token
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: `${prompt}, aspect ${aspectRatio}` }),
      }
    );

    const type = response.headers.get("content-type");
    if (type?.includes("application/json")) {
      const data = await response.json();
      throw new Error(data.error || "HuggingFace error");
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  // Providers setup
  const providers = [
    { key: "YABES", fn: generateWithYabes },
    { key: "HF", fn: generateWithHuggingFace },
    { key: "POLLINATIONS", fn: generateWithPollinations },
  ];

  // Generate main function
  const generateVideo = async () => {
    if (!prompt.trim()) return alert("Please enter a prompt first!");

    setLoading(true);
    setVideoUrl("");
    setCurrentAttempt("");

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 2, 95);
      setCurrentAttempt(`Generating... ${progress}%`);
    }, 500);

    for (let i = 0; i < providers.length; i++) {
      const { key, fn } = providers[i];
      setCurrentAttempt(`Trying ${key} Engine (${i + 1}/${providers.length})`);

      try {
        const result = await fn(prompt);
        if (result) {
          clearInterval(progressInterval);
          setVideoUrl(result);
          saveToHistory({ url: result, aspect: aspectRatio });
          setCurrentAttempt(`Success with ${key} ✅`);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn(`${key} failed:`, err);
        await delay(500);
      }
    }

    clearInterval(progressInterval);
    setCurrentAttempt("All providers failed ❌");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 flex flex-col items-center">
      <motion.h1
        className="text-4xl font-bold mb-4 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🎥 Niro AI Video Generator
      </motion.h1>

      <Card className="w-full max-w-xl bg-gray-900 border-gray-700">
        <CardContent className="p-6 space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video idea..."
            className="w-full h-28 p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-indigo-500"
          />

          {/* Aspect Ratio Selector */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Aspect Ratio:</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
            >
              {aspectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={generateVideo}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                <span>{currentAttempt || "Processing..."}</span>
              </>
            ) : (
              <>
                <PlayCircle />
                <span>Generate Video</span>
              </>
            )}
          </Button>

          {videoUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <video
                controls
                className="w-full rounded-lg shadow-lg"
                style={{
                  aspectRatio: aspectRatio.replace(":", "/"),
                }}
              >
                <source src={videoUrl} type="video/mp4" />
              </video>

              <Button
                variant="secondary"
                className="w-full mt-3 flex items-center justify-center space-x-2"
                onClick={() => window.open(videoUrl, "_blank")}
              >
                <Download />
                <span>Download Video</span>
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className="mt-10 w-full max-w-xl">
        <h2 className="text-xl font-semibold flex items-center space-x-2 mb-4">
          <History className="text-indigo-400" />
          <span>Recent History</span>
        </h2>

        {videoHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoHistory.map((v, i) => (
              <div
                key={i}
                className="bg-gray-800 p-3 rounded-lg flex flex-col items-center"
              >
                <video
                  src={v.url}
                  controls
                  className="rounded-lg w-full"
                  style={{
                    aspectRatio: v.aspect.replace(":", "/"),
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ratio: {v.aspect}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center">
            No videos generated yet.
          </p>
        )}
      </div>
    </div>
  );
}
